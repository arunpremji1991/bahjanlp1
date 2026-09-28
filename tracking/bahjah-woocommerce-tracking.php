<?php
/**
 * Plugin Name: Bahjah – Sponsorship Campaign Tracking
 * Description: Fires payment-page-visit and completed-sponsorship events on bahjah.org.om for paid-campaign
 *              attribution (dataLayer + optional Meta Pixel / Google Ads). Read-only with respect to payments:
 *              it does NOT change prices, cart, checkout or the Bank Muscat SmartPay gateway.
 *
 * Install: copy to wp-content/mu-plugins/ on bahjah.org.om, then fill in the constants below.
 * Pages covered:
 *   - Product "برنامج كفالة يتيم" (ID 3294)  → payment_page_view   (Meta: ViewContent)
 *   - Checkout page                         → begin_checkout      (Meta: InitiateCheckout)
 *   - Order received (thank-you) page       → purchase / sponsorship_complete (Meta: Purchase, Google Ads conversion)
 * Attribution: UTM / click IDs forwarded by the landing page are kept in a first-party cookie and saved
 *              as order meta (_bahjah_attribution) so completed sponsorships can be attributed to campaigns.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// ---- CONFIG (leave empty to disable a tag) ----
const BAHJAH_SPONSOR_PRODUCT_ID = 3294;
const BAHJAH_META_PIXEL_ID      = '';   // e.g. '123456789012345' — skip if the pixel is already installed site-wide
const BAHJAH_GADS_ID            = '';   // e.g. 'AW-123456789'
const BAHJAH_GADS_PURCHASE_LBL  = '';   // conversion label for completed sponsorship
const BAHJAH_ATTR_KEYS          = array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
                                         'gclid', 'gbraid', 'wbraid', 'fbclid', 'lp', 'lp_cta' );

/** Store forwarded attribution params in a 30-day first-party cookie. */
add_action( 'init', function () {
	if ( is_admin() || empty( $_GET ) ) { return; }
	$attr = array();
	foreach ( BAHJAH_ATTR_KEYS as $k ) {
		if ( isset( $_GET[ $k ] ) && '' !== $_GET[ $k ] ) {
			$attr[ $k ] = substr( sanitize_text_field( wp_unslash( $_GET[ $k ] ) ), 0, 200 );
		}
	}
	if ( $attr ) {
		setcookie( 'bahjah_attr', wp_json_encode( $attr ), array(
			'expires'  => time() + 30 * DAY_IN_SECONDS,
			'path'     => '/',
			'secure'   => is_ssl(),
			'httponly' => false,
			'samesite' => 'Lax',
		) );
		$_COOKIE['bahjah_attr'] = wp_json_encode( $attr );
	}
} );

function bahjah_get_attr() {
	if ( empty( $_COOKIE['bahjah_attr'] ) ) { return array(); }
	$data = json_decode( wp_unslash( $_COOKIE['bahjah_attr'] ), true );
	return is_array( $data ) ? array_intersect_key( $data, array_flip( BAHJAH_ATTR_KEYS ) ) : array();
}

/** Save attribution on the order (metadata only — no effect on totals or payment). */
add_action( 'woocommerce_checkout_create_order', function ( $order ) {
	$attr = bahjah_get_attr();
	if ( $attr ) { $order->update_meta_data( '_bahjah_attribution', $attr ); }
} );

/** Base tags (only if configured and not already present). */
add_action( 'wp_head', function () {
	echo "<script>window.dataLayer=window.dataLayer||[];</script>\n";
	if ( BAHJAH_META_PIXEL_ID ) {
		printf( "<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','%s');fbq('track','PageView');</script>\n", esc_js( BAHJAH_META_PIXEL_ID ) );
	}
	if ( BAHJAH_GADS_ID ) {
		printf( "<script async src=\"https://www.googletagmanager.com/gtag/js?id=%1\$s\"></script><script>function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','%1\$s');</script>\n", esc_attr( BAHJAH_GADS_ID ) );
	}
}, 5 );

/** Event helper printed in the footer. */
function bahjah_emit( $dl, $fb_event = '', $fb_params = array(), $event_id = '', $gads_label = '' , $gads_params = array() ) {
	$js  = 'window.dataLayer.push(' . wp_json_encode( $dl ) . ');';
	if ( $fb_event ) {
		$js .= sprintf( "if(window.fbq)fbq('track',%s,%s,%s);", wp_json_encode( $fb_event ), wp_json_encode( (object) $fb_params ), wp_json_encode( array( 'eventID' => $event_id ) ) );
	}
	if ( $gads_label && BAHJAH_GADS_ID ) {
		$gads_params['send_to'] = BAHJAH_GADS_ID . '/' . $gads_label;
		$js .= sprintf( "if(window.gtag)gtag('event','conversion',%s);", wp_json_encode( $gads_params ) );
	}
	echo '<script>' . $js . "</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput
}

add_action( 'wp_footer', function () {
	if ( ! function_exists( 'is_product' ) ) { return; }
	$attr = bahjah_get_attr();

	// 1) Payment page visit — sponsorship product page
	if ( is_product() && get_queried_object_id() === BAHJAH_SPONSOR_PRODUCT_ID ) {
		$eid = 'pp-' . wp_generate_uuid4();
		bahjah_emit(
			array( 'event' => 'payment_page_view', 'product_id' => BAHJAH_SPONSOR_PRODUCT_ID, 'value' => 25, 'currency' => 'OMR', 'attribution' => $attr, 'event_id' => $eid ),
			'ViewContent', array( 'content_ids' => array( (string) BAHJAH_SPONSOR_PRODUCT_ID ), 'content_type' => 'product', 'value' => 25, 'currency' => 'OMR' ), $eid
		);
	}

	// 2) Checkout step
	if ( is_checkout() && ! is_order_received_page() && WC()->cart && ! WC()->cart->is_empty() ) {
		$eid = 'co-' . wp_generate_uuid4();
		bahjah_emit(
			array( 'event' => 'begin_checkout', 'value' => (float) WC()->cart->get_total( 'edit' ), 'currency' => get_woocommerce_currency(), 'attribution' => $attr, 'event_id' => $eid ),
			'InitiateCheckout', array( 'value' => (float) WC()->cart->get_total( 'edit' ), 'currency' => get_woocommerce_currency() ), $eid
		);
	}
} );

// 3) Completed conversion — thank-you page (fires once per order)
add_action( 'woocommerce_thankyou', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order || $order->get_meta( '_bahjah_tracked' ) ) { return; }
	if ( ! in_array( $order->get_status(), array( 'processing', 'completed', 'on-hold' ), true ) ) { return; }

	$is_sponsorship = false;
	$items = array();
	foreach ( $order->get_items() as $item ) {
		$pid = $item->get_product_id();
		if ( (int) $pid === BAHJAH_SPONSOR_PRODUCT_ID ) { $is_sponsorship = true; }
		$items[] = array( 'item_id' => (string) $pid, 'item_name' => $item->get_name(), 'quantity' => $item->get_quantity(), 'price' => (float) $order->get_item_total( $item ) );
	}

	$eid   = 'order-' . $order->get_id(); // use the same ID in Conversions API for deduplication
	$value = (float) $order->get_total();
	$cur   = $order->get_currency();

	bahjah_emit(
		array(
			'event'       => $is_sponsorship ? 'sponsorship_complete' : 'purchase',
			'ecommerce'   => array( 'transaction_id' => (string) $order->get_id(), 'value' => $value, 'currency' => $cur, 'items' => $items ),
			'attribution' => $order->get_meta( '_bahjah_attribution' ) ?: array(),
			'event_id'    => $eid,
		),
		'Purchase', array( 'value' => $value, 'currency' => $cur, 'content_ids' => wp_list_pluck( $items, 'item_id' ), 'content_type' => 'product' ), $eid,
		BAHJAH_GADS_PURCHASE_LBL, array( 'value' => $value, 'currency' => $cur, 'transaction_id' => (string) $order->get_id() )
	);

	$order->update_meta_data( '_bahjah_tracked', 1 );
	$order->save();

	/*
	 * Meta Conversions API (server side) — placeholder.
	 * Recommended: use Meta's official "Facebook for WooCommerce" plugin or server-side GTM, sending the
	 * Purchase event with event_id = $eid so it deduplicates with the browser pixel event above.
	 * If implementing manually, POST to https://graph.facebook.com/v{VERSION}/{PIXEL_ID}/events with an
	 * access token stored in wp-config.php (never in this file), hashing user_data per Meta's spec.
	 */
}, 20 );
