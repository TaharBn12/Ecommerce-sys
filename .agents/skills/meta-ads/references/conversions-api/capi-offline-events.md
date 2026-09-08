<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

Was this helpful?

# Sending Offline Events Using the Conversions API

Updated: Jan 5, 2026

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/offline-events.md)

The Conversions API is Meta’s recommended integration method for sending offline and physical store events to Meta for use in ad measurement, attribution, and targeting. This page details how to send offline events via a Conversions API direct or partner integration.

**Note**: This guide covers sending Offline events through the Conversions API, primarily for Omni Ads Optimization. If you’re looking for guidance on sending CRM events for Conversion Leads Optimization, refer to the development documentation [here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration).

## Prerequisites

### Dataset

Offline events sent through the Conversions API must be associated with a dataset.

Datasets allow advertisers to connect and manage event data from web, app, store and business messaging event sources to the Conversions API. Datasets may show event data from any of these integrations that you choose to set up:

Meta Pixel (website events)
App Events API (app events, including Facebook SDK for iOS or Android, mobile measurement partners (MMPs))
Offline Conversions API (Meta’s legacy API for offline events)
Messaging Events API (messaging events)

Datasets enable you to view all customer activities from a single interface. They also allow you to reduce the effort to build and maintain multiple API integrations.

In Events Manager, advertisers have different [options⁠](https://www.facebook.com/business/help/5270377362999582?id=490360542427371) to create a dataset depending on their starting point. Or you can [create a brand new dataset⁠](https://www.facebook.com/business/help/5818684664831465?id=490360542427371) in Events Manager by linking during offline event set creation or through an existing mobile app or during messaging event set creation information. Note that linking a dataset to an application is required before sending mobile app events to the Conversions API and only one application can be linked to a dataset. See more [details⁠](https://www.facebook.com/business/help/768703235046938?locale=en_US) and instructions [here⁠](https://www.facebook.com/business/help/750785952855662?id=490360542427371).

You can make the `GET` call to [https://graph.facebook.com/v16.0/{ads-pixel-id}/?fields=is\_consolidated\_container](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ads-pixel) to detect if the advertiser’s dataset is consolidated and thus eligible for passing offline events using the Conversions API.

### Permissions

To implement a direct integration as an advertiser, please follow the instructions [here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/get-started#integration-methods) for prerequisites and permissions.

To implement a partner platform integration, please follow the instructions [here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/guides/end-to-end-implementation#integration-as-a-platform) for prerequisites and permissions.

## Configuration

### 1\. Set Up Offline Event Parameters

Advertisers can use the setup mentioned [here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/guides/end-to-end-implementation) and refer to the [current set of parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters) that can be sent over the Conversions API. For sending offline and store events, the following fields can be shared in the payload:

Advertisers need to send [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) as `physical_store` for all offline and store events. Note that this parameter is required for all server event types. By using the Conversions API, you agree that the [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) parameter is accurate to the best of your knowledge.
All required [server event fields](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event) for Conversions API must be respected.
[Customer information parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters) (see below for appropriate list of parameters for offline and store events).
[Custom data parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/custom-data) (see below for appropriate list of parameters for offline and store events).
Optional parameter: the `upload_tag` parameter is still supported for offline event uploads for advertisers using legacy API for offline events.

### Customer Information Parameters

The following list contains customer information parameters that are typically used for offline and store events:

| Parameter names | Parameter | Hashing required |
| --- | --- | --- |
| Email Address(es) | `email` | YES |
| Phone Number(s) | `phone` | YES |
| Gender | `gen` | YES |
| Date of Birth | `db` | YES |
| Last Name | `ln` | YES |
| First Name | `fn` | YES |
| City | `ct` | YES |
| US States | `st` | YES |
| Zip codes | `zip` | YES |
| Country | `country` | YES |
| Mobile Advertiser ID | `madid` | Do not hash<br>The advertising ID from an Android device or the Advertising Identifier (IDFA) from an Apple device. |
| Third-party user id | `external_id` | Highly recommended |
| The lead id from Lead Ads | `lead_id` | Do not hash |

### Custom Data Parameters

The following section contains common custom parameters used by offline and store events. For more custom data fields, please refer to the full list we accept for Conversions API in the following [link](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/custom-data).

| Parameter | Description |
| --- | --- |
| `event_time`<br>type: integer | **Required**<br>The UNIX timestamp of the conversion event.<br>* * *<br>**Example:**`'1456870055'` |
| `event_name`<br>type: string | **Required**<br>Type of event.<br>* * *<br>**Example:**`ViewContent, Search, AddToCart, AddToWishlist, InitiateCheckout, AddPaymentInfo, Purchase, Lead, Other` |
| `store_data`<br>type: JSON dictionary | **Optional**<br>Store location data about conversion event.<br>* * *<br>**Example:**<br>```<br>"store_data":<br>    {<br>        "store_page_id": 8576093908, // FBID<br>        "brand_page_id": 10236898932// FBID<br>        "store_code": "64CharacterAlphaNumericString" // String<br>    }<br>``` |
| `currency`<br>type: string | **Required**<br>Three-letter [ISO currency code⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.iso.org%2Fiso-4217-currency-codes.html%3Ffbclid%3DIwAR0xKRCr-IrwOUtAz9A8DkpNhv8Fdix5Z8FeofygygO6kBtdu-YLJccUlgk&h=AUAaOiXRWQlLPRC56vqC0JQe7-Tx2VEp_R2VGeL4Hv-vDDDn4s9RoZ54wEPf-r_GhuqyIatcr1EvRH4VOSDIQZ7mwsFYfwc7KwcESQQTfbhXl7umIpjoVX-tvVLy7IFvE2k3wuksFgBO6g) for this conversion event. Required for `Purchase` events.<br>* * *<br>**Example:**`USD` |
| `value`<br>type: double | **Required**<br>Value of conversion event. Required for `Purchase` events.<br>* * *<br>**Example:**`16.00` |
| `content_type`<br>type: string | **Optional**<br>Any valid [Advantage+ catalog ads](https://developers.facebook.com/docs/meta-pixel/get-started/advantage-catalog-ads)`content_type`.<br>* * *<br>**Example:**`product` |
| `contents`<br>type: JSON array | **Optional**. Required if you integrate your ads with [catalog](https://developers.facebook.com/documentation/ads-commerce/catalog).<br>Required: `id`, `quantity`<br>Recommended: `price`, `brand`, `category`<br>Required: `[ {id: "A", quantity: 1}, {id: "B", quantity: 2}, {id: "C", quantity: 1}]`<br>Recommended: `[ {id: "A", quantity: 1, brand: "Brand_A", category: "", price: 10.0}]` |
| `custom_data`<br>type: JSON dictionary | **Optional**.<br>Information about this conversion event.<br>**Example**: `{category: 'ICECREAM'}` |
| `order_id`<br>type: string | **Optional**.<br>Unique identifier for each transaction or order in an offline event set. For example, for retail this can be a receipt ID.<br>**Example**: `ATN10001`, `123456` |
| `item_number`<br>type: string | **Optional**.<br>Unique identifier to distinguish events within the same order or transaction.<br>**Example**: `1`, `a` |

### 2\. Sending Events

To send new events, make a `POST` request to the Conversions API from this path: `https://graph.facebook.com/{API_VERSION}/{DATASET_ID}/events?access_token={TOKEN}`

When you post to this edge, Meta creates new offline and store events. For more details, please refer to the following [developer document](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api).

Here is an overview of how the parameters fit into the overall schema in the payload:

```
curl -X POST \
  -F 'data=[\
       {\
  "event_name": "Purchase",\
  "event_time": 1674000041,\
  "user_data": {\
    "em": [\
      "309a0a5c3e211326ae75ca18196d301a9bdbd1a882a4d2569511033da23f0abd"\
    ],\
    "ph": [\
      "254aa248acb47dd654ca3ea53f48c2c26d641d23d7e2e93a1ec56258df7674c4",\
      "6f4fcb9deaeadc8f9746ae76d97ce1239e98b404efe5da3ee0b7149740f89ad6"\
    ]\
  },\
  "custom_data": {\
    "currency": "usd",\
    "value": 123.45,\
    "contents": [{\
      "id": "product123",\
      "quantity": 1\
    }]\
  },\
  "action_source": "physical_store"\
}\
]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v15.0/<DATASET_ID>/events
```

We recommend uploading in real time or on a daily basis for optimal optimization results so that offline data can be effectively matched against the performance of any ads you’re running.

The [`event_time`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-time) can be up to 7 days before you send an event to Meta. If any `event_time` in `data` is greater than 7 days in the past, we return an error for the entire request and process no events. For offline and physical store events with `physical_store` as `action_source`, you should upload transactions within 62 days of the conversion.

The data you upload is processed in real time so you can usually view results as soon as you add it. You can refer to the Help Center document about [Best Practices for Offline events data⁠](https://www.facebook.com/business/help/1798506233494677?id=565900110447546).

### 3\. Set Up Deduplication

Unlike [deduplication set up across Conversions API and Meta Pixel events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events), offline events can be deduplicated against other offline events only. We support two methods of deduplication: **order\_id** based or **user** based. The deduplication uses the combination of fields: `dataset_id`, `event_time`, `event_name`, `item_number`, and the key field based on method in the given event’s payload.

The default deduplication uses **order\_id** with a combination of the fields above. If **order\_id** is not present in the payload, the **user** based deduplication logic will be used.

For example, where there are two orders with identical `event_time`, `event_name` having the same **order\_id** or same set of [Customer Information Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/offline-events#customer-information-parameters) without **order\_id**, we will consider them duplicate events and take the first event. The **user** based deduplication method only works with the same [Customer Information Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/offline-events#customer-information-parameters) fields in the two payloads.

The maximum deduplication window is 7 days.

### 4\. Troubleshooting Events

You can use the [Payload Helper tool](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper) to generate payload data:

Choose `physical_store` action source when applicable. By using the Conversions API, you agree that the [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) parameter is accurate to the best of your knowledge.
Fill info for the events that will be sent to Meta
This will generate event payload, which can be used as a template for your Conversions API integration

Use the [Test Events tool⁠](https://www.facebook.com/business/help/2040882565969969?id=1205376682832142) in Events Manager for testing your payload.

## See Also

[Dataset Quality API for Offline Events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/dataset-quality-api/offline-events)
[Omni Optimal Setup Guide: Best Practices and Requirements](https://developers.facebook.com/documentation/ads-commerce/marketing-api/best-practices/omni-optimal-setup-guide)
[Conversions API Overview](https://developers.facebook.com/documentation/ads-commerce/conversions-api)
[Using the Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api)
[Conversions API Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters)
[Best Practices](https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices)

### Business Help Center Articles

[Create a dataset during offline event set creation⁠](https://www.facebook.com/business/help/5818684664831465?id=490360542427371)
[Best practices for offline events data⁠](https://www.facebook.com/business/help/1798506233494677?id=565900110447546)
[How advertisers can use offline conversions⁠](https://www.facebook.com/business/help/1142103235885551?id=565900110447546)
[How to view results of campaigns assigned to specific dataset⁠](https://www.facebook.com/business/help/154283205023788?id=565900110447546&ref=search_new_3)
[How event deduplication works for offline events⁠](https://www.facebook.com/business/help/1772588746090250?id=565900110447546&ref=search_new_9)

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *