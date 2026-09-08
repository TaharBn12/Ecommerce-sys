<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

Was this helpful?

# Parameters

Updated: Jun 30, 2026

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters.md)

This page groups the Conversions API parameters by family, covering the required event data parameters and the additional parameters that support ads attribution and ads delivery optimization.

[The Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api) now supports web, app, offline, and business messaging events.

Website events shared using the Conversions API require the [`client_user_agent`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#client-user-agent), [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source), and [`event_source_url`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-source-url) parameters, while non-web events **require only** [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source). These parameters contribute to improving the quality of events used for ad delivery and may improve campaign performance.

By using the Conversions API, you agree that the [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) parameter is accurate to the best of your knowledge.

### [Main Body Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/main-body)

[`data`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/main-body#data)
[`test_event_code`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/main-body#test-event-code)

### [Customer information parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters)

[`em`: Email](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#em) — Hashing required
[`ph`: Phone Number](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ph) — Hashing required
[`fn`: First Name](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#fn) — Hashing required
[`ln`: Last Name](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ln) — Hashing required
[`ge`: Gender](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ge) — Hashing required
[`db`: Date of Birth](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#db) — Hashing required
[`ct`: City](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ct) — Hashing required
[`st`: State](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#st) — Hashing required
[`zp`: Zip Code](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#zp) — Hashing required
[`country`: Country](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#country) — Hashing required
[`external_id`: External ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#external-id) — Hashing recommended
[`client_ip_address`: Client IP Address](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#client_ip_address) — Do not hash
[`client_user_agent`: Client User Agent](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#client-user-agent) — Do not hash
[`fbc`: Click ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#fbc) — Do not hash
[`fbp`: Browser ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#fbp) — Do not hash
[`subscription_id`: Subscription ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#subscription_id) — Do not hash
[`fb_login_id`: Facebook Login ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#fb_login_id) — Do not hash
[`lead_id`: Lead ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#lead_id) — Do not hash
[`anon_id`: Install ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#anon_id) — Do not hash ( _**Note:** This parameter is for app events only_)
[`madid`: Mobile Advertiser ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#madid) — Do not hash ( _**Note:** This parameter is for app events only_)
[`page_id`: Page ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#page_id) — Do not hash
[`page_scoped_user_id`: Page scoped user ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#page_scoped_user_id) — Do not hash
[`ctwa_clid`: Click to WhatsApp ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ctwa_clid) — Do not hash
[`ig_account_id`: IG account ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ig_account_id) — Do not hash
[`ig_sid`: Click to Instagram ID](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#ig_sid) — Do not hash

### [Server Event Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event)

[`event_name`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-name)
[`event_time`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-time)
[`user_data`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#user-data)
[`custom_data`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#custom-data)
[`event_source_url`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-source-url)
[`opt_out`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#opt-out)
[`event_id`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-id)
[`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source)
[`data_processing_options`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#data-processing-options)
[`data_processing_options_country`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#data-processing-options-country)
[`data_processing_options_state`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#data-processing-options-state)
[`referrer_url`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#referrer-url)
[`customer_segmentation`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#customer-segmentation)

### [App data parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data)

[`advertiser_tracking_enabled`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#advertiser-tracking-enabled)
[`application_tracking_enabled`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#application-tracking-enabled)
[`extinfo`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#extinfo)
[`campaign_ids`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#campaign-ids)
[`install_referrer`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#install-referrer)
[`installer_package`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#installer-package)
[`url_schemes`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#url-schemes)
[`windows_attribution_id`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#windows-attribution-id)
[`anon_id`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#anon_id)
[`madid`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#madid)
[`vendor_id`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/app-data#vendor-id)

_**Note**: See the [Conversions API for App Events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/app-events) documentation for guidance on integrating app events._

### [Standard parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/custom-data)

See a list of all [standard parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/custom-data) users can send to Meta.

### [Original event data parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/original-event)

[`event_name`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/original-event#event-name-oed)
[`event_time`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/original-event#event-time-oed)
[`order_id`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/original-event#order-id-oed)
[`event_id`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/original-event#event-id-oed)

### Conversions API for lead optimization

If you integrate your CRM system with the Conversions API for lead events, refer to the [CRM Integration](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/crm-integration) guide for the required fields.

### See also

Overview: [`fbp` and `fbc` Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc)

## Learn more

[Conversions API: Documentation](https://developers.facebook.com/documentation/ads-commerce/conversions-api)
[Using the Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api)
[Meta Privacy and Data Use Guide⁠](https://www.facebook.com/business/m/privacy-and-data#Data-Use-&-Ads)

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *