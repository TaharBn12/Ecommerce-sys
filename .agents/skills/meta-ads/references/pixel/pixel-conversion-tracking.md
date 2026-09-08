<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# Conversion Tracking

Updated: Jun 30, 2026

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking.md)

You can use the Meta Pixel to track your website visitors’ actions also known as conversion tracking. Tracked conversions appear in the [Facebook Ads Manager⁠](https://www.facebook.com/adsmanager) and the [Facebook Events Manager⁠](https://www.facebook.com/events_manager2), where they can be used to analyze the effectiveness of your conversion funnel and to calculate your return on ad investment. You can also use tracked conversions to define [custom audiences](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences) for ad optimization and [Advantage+ catalog ads](https://developers.facebook.com/docs/facebook-pixel/implementation/dynamic-ads) campaigns. Once you have defined custom audiences, we can use them to identify other Facebook users who are likely to convert and target them with your ads.

There are three ways to track conversions with the Pixel:

[standard events](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#standard-events), which are visitor actions that we have defined and that you report by calling a Pixel function
[custom events](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#custom-events), which are visitor actions that you have defined and that you report by calling a Pixel function
[custom conversions](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#custom-conversions), which are visitor actions that are tracked automatically by parsing your website’s referrer URLs

Beginning September 2, 2025, we will start to roll out more proactive restrictions on custom conversions that may suggest information not permitted under [our terms⁠](https://www.facebook.com/legal/terms/businesstools?_rdr). For example, any custom conversion suggesting specific health conditions (e.g., “arthritis”, “diabetes”) or financial status (e.g., “credit score”, “high income”) will be flagged and prevented from being used to run ad campaigns.

**What these restrictions mean for your campaigns:**

You won’t be able to use flagged custom conversions when creating new campaigns.
If you have an active campaign using flagged custom conversions, you should either create a new campaign or duplicate your campaign and use a non-impacted custom conversion to avoid performance and optimization issues.

**For API developers:**

Beginning September 2, 2025, the field `is_unavailable` will return `true` to signal if your custom conversions have been flagged.

More information on this update and how to resolve flagged custom conversions can be found [here⁠](https://www.facebook.com/business/help/2455915321411996).

### Requirements

The Pixel’s [base code](https://developers.facebook.com/documentation/meta-pixel/get-started#base-code) must already be installed on every page where you want to track conversions.

## Standard Events

[Standard events](https://developers.facebook.com/documentation/meta-pixel/reference#standard-events) are predefined visitor actions that correspond to common, conversion-related activities, such as searching for a product, viewing a product, or purchasing a product. Standard events support [parameters](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#parameters), which allow you to include an object containing additional information about an event, such as product IDs, categories, and the number of products purchased.

For a full list of [Standard events](https://developers.facebook.com/documentation/meta-pixel/reference#standard-events) visit the [Pixel Standard Events Reference](https://developers.facebook.com/documentation/meta-pixel/reference#standard-events). Learn more about conversion tracking and standard events with [Blueprint⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219710-technical-implementation-meta-pixel%3Fcontent_id%3Den4RqCL2PfBZrUU&h=AUAIz3AMlNryd-V2gnFMVsYcrYCKp_hWWm-cfuTpQrkXBSQzOk-XP5vANTBK8Yv_HsPhcutdfIUo97IIvQlMaC-H7XaUef2DgmBisXoLZKTiR0cHmMwX0iUqXCLph-DncZUytwTYL0sK-A).

### Tracking Standard Events

All standard events are tracked by calling the Pixel’s `fbq('track')` function, with the event name, and (optionally) a JSON object as its parameters. For example, here’s a function call to track when a visitor has completed a purchase event, with currency and value included as a parameter:

```
fbq('track', 'Purchase', {currency: "USD", value: 30.00});
```

If you called that function, it would be tracked as a purchase event in the Events Manager:

![Events Manager Events tab charting PageView and Purchase events over time, with a tooltip showing one tracked Purchase event](https://scontent-lax3-1.xx.fbcdn.net/v/t39.2365-6/39949625_1790839247617931_4027789432194072576_n.png?_nc_cat=110&ccb=1-7&_nc_sid=e280be&_nc_ohc=CQGKwCd-MRYQ7kNvwEDognz&_nc_oc=AdrtSLv86bvro2QLFBGLpaDYp08vjg-edDQ2LJWZo019ZAmPy3Rl5Go7Ba0tmsikS94&_nc_zt=14&_nc_ht=scontent-lax3-1.xx&_nc_gid=67ycXgYe3y2hnJu3_SiT0Q&_nc_ss=7b289&oh=00_AQIu0DVLPPN-HEK_fj39c99yadkzeivJaYsWzw4U2i4ngg&oe=6ABA3D1C)

You can call the `fbq('track')` function anywhere between your web page’s opening and closing `<body>` tags, either when the page loads, or when a visitor completes an action, such as clicking a button.

For example, if you wanted to track a standard purchase event _after a visitor has completed the purchase_, you could call the `fbq('track')` function on your _purchase confirmation page_, like this:

```
<body>
  ...
  <script>
    fbq('track', 'Purchase', {currency: "USD", value: 30.00});
  </script>
  ...
</body>
```

If instead you wanted to track a standard purchase event _when the visitor clicks a purchase button_, you could tie the `fbq('track')` function call to the purchase button _on your checkout page_, like this:

```
<button id="addToCartButton">Purchase</button>
<script type="text/javascript">
  $('#addToCartButton').click(function() {
    fbq('track', 'Purchase', {currency: "USD", value: 30.00});
  });
</script>
```

Note that the example above uses jQuery to trigger the function call, but you could trigger the function call using any method you wish.

## Custom Events

If our predefined standard events aren’t suitable for your needs, you can track your own custom events, which also can be used to define [custom audiences](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences) for ad optimization. Custom events also support [parameters](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#parameters), which you can include to provide additional information about each custom event.

Learn more about conversion tracking and custom events with [Blueprint⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219710-technical-implementation-meta-pixel%3Fcontent_id%3Den4RqCL2PfBZrUU&h=AUAIz3AMlNryd-V2gnFMVsYcrYCKp_hWWm-cfuTpQrkXBSQzOk-XP5vANTBK8Yv_HsPhcutdfIUo97IIvQlMaC-H7XaUef2DgmBisXoLZKTiR0cHmMwX0iUqXCLph-DncZUytwTYL0sK-A).

### Tracking Custom Events

You can track custom events by calling the Pixel’s `fbq('trackCustom')` function, with your custom event name and (optionally) a JSON object as its parameters. Just like standard events, you can call the `fbq('trackCustom')` function anywhere between your webpage’s opening and closing `<body>` tags, either when your page loads, or when a visitor performs an action like clicking a button.

For example, let’s say you wanted to track visitors who share a promotion in order to get a discount. You could track them using a custom event like this:

```
fbq('trackCustom', 'ShareDiscount', {promotion: 'share_discount_10%'});
```

Custom event names must be strings, and cannot exceed 50 characters in length.

## Custom Conversions

Each time the Pixel loads, it automatically calls `fbq('track', 'PageView')` to track a PageView standard event. PageView standard events record the referrer URL of the page that triggered the function call. You can use these recorded URLs in the Events Manager to define visitor actions that should be tracked.

For example, let’s say that you send visitors who subscribe to your mailing list to a thank you page. You could set up a custom conversion that tracks website visitors who have viewed any page that has `/thank-you` in its URL. Assuming your thank you page is the only page with `/thank-you` in its URL, and you’ve installed the Pixel on that page, anyone who views it will be tracked using that custom conversion.

Once tracked, custom conversions can be used to optimize your ad campaigns, to define [custom audiences](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences), and to further refine custom audiences that rely on standard or custom events. Learn more about custom conversions with [Blueprint⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219710-technical-implementation-meta-pixel%3Fcontent_id%3Den4RqCL2PfBZrUU&h=AUAIz3AMlNryd-V2gnFMVsYcrYCKp_hWWm-cfuTpQrkXBSQzOk-XP5vANTBK8Yv_HsPhcutdfIUo97IIvQlMaC-H7XaUef2DgmBisXoLZKTiR0cHmMwX0iUqXCLph-DncZUytwTYL0sK-A).

Since custom conversions rely on complete or partial URLs, you should make sure that you can define visitor actions exclusively based on unique strings in your website URLs.

### Creating Custom Conversions

Custom conversions are created entirely within the Events Manager. Refer to our [Advertiser Help document⁠](https://www.facebook.com/business/help/434245993430255) to learn how.

### Rule-Based Custom Conversions

Optimize for actions and track them without adding anything to your Meta Pixel base code. You can do this beyond the 17 standard events.

Create a custom conversion at `/{AD_ACCOUNT_ID}/customconversions`.
Specify a URL, or partial URL, representing an event in `pixel_rule`. For example, `thankyou.html` is a page appearing after purchase.

This records a `PURCHASE` conversion when `'thankyou.html'` displays:

You can then create your campaign using the `CONVERSIONS` objective.

At the ad set level, specify the same custom conversion (`pixel_id`, `pixel_rule`, `custom_event_type`) in `promoted_object`.

### Custom Conversions Insights

[Ads Insights](https://developers.facebook.com/docs/marketing-api/insights-api) returns information about Custom Conversions:

```
curl -i -G \
-d 'fields=actions,action_values' \
-d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v2.7/<AD_ID>/insights
```

Returns both standard and custom conversions:

```
{
  "data": [\
    {\
      "actions": [\
        {\
          "action_type": "offsite_conversion.custom.17067367629523",\
          "value": 1225\
        },\
        {\
          "action_type": "offsite_conversion.fb_pixel_purchase",\
          "value": 205\
        }\
      ],\
      "action_values": [\
        {\
          "action_type": "offsite_conversion.custom.1706736762929507",\
          "value": 29390.89\
        },\
        {\
          "action_type": "offsite_conversion.fb_pixel_purchase",\
          "value": 29390.89\
        }\
      ],\
      "date_start": "2016-07-28",\
      "date_stop": "2016-08-26"\
    }\
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MjQZD"
    },
    "next": "https://graph.facebook.com/v2.7/<AD_ID>/insights?access_token=<ACCESS_TOKEN>&pretty=0&fields=actions%2Caction_values&date_preset=last_30_days&level=adset&limit=25&after=MjQZD"
  }
}
```

Custom conversions have unique IDs; query it for a specific conversion, such as a rule-based one:

```
curl -i -G \
-d 'fields=name,pixel,pixel_aggregation_rule' \
-d 'access_token=ACCESS-TOKEN' \
https://graph.facebook.com/v2.7/<CUSTOM_CONVERSION_ID>
```

### Custom Conversions Limitations

The maximum number of custom conversions per ad account is 100. If you use Ads Insights API to get metrics on custom conversions:

Getting product ID breakdowns are not supported.
Getting unique action counts are not supported.

### Flagged custom conversions

If a custom conversion is flagged, the `is_unavailable` field will be set to `true`.

```
{
  "is_unavailable": true,
  "id": "30141209892193360"
}
```

#### To resolve flagged custom conversions

If any of your custom conversions are flagged for suggesting information that is not allowed under our terms, you may want to consider the following options:

To resolve a flagged custom conversion in a new campaign creation:

**Create new custom conversion**: Use a new custom conversion and make sure that it does not include information that is not allowed under our terms.
**Choose a different custom conversion**: Select a different existing custom conversion and make sure it does not include information that is not allowed under our terms.

To resolve a flagged custom conversion in an existing campaign:

**Duplicate your campaign and select an existing custom conversion**: If you have a running campaign that is flagged due to a flagged custom conversion, consider duplicating the campaign and selecting a different custom conversion that is not flagged before publishing the new duplicated campaign. **Note:** Once the campaign is published, you cannot remove or select a different custom conversion.

#### Request a review

If you believe your custom conversion has been flagged in error and doesn’t include non-permitted information, you can request a review via Ads Manager under the campaigns table, or in Events Manager under the custom conversions page.

## Track Offsite Conversions

Track offsite conversions with your Pixels by adding the `fb_pixel` field to the `tracking_spec` parameter of your ad. [Learn more.](https://developers.facebook.com/documentation/ads-commerce/marketing-api/tracking-specs)

## Parameters

Parameters are optional, JSON-formatted objects that you can include when tracking standard and custom events. They allow you to provide additional information about your website visitors’ actions. Once tracked, parameters can be used to further define any custom audiences you create. Learn more about parameters with [Blueprint⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219710-technical-implementation-meta-pixel%3Fcontent_id%3Den4RqCL2PfBZrUU&h=AUAIz3AMlNryd-V2gnFMVsYcrYCKp_hWWm-cfuTpQrkXBSQzOk-XP5vANTBK8Yv_HsPhcutdfIUo97IIvQlMaC-H7XaUef2DgmBisXoLZKTiR0cHmMwX0iUqXCLph-DncZUytwTYL0sK-A).

To include a parameter object with a standard or custom event, format your parameter data as an object using JSON, then include it as the third function parameter when calling the `fbq('track')` or `fbq('trackCustom')` functions.

For example, let’s say you wanted to track a visitor who purchased multiple products as a result of your promotion. You could do this:

```
fbq('track', 'Purchase',
  // begin parameter object data
  {
    value: 115.00,
    currency: 'USD',
    contents: [\
      {\
        id: '301',\
        quantity: 1\
      },\
      {\
        id: '401',\
        quantity: 2\
      }],
    content_type: 'product'
  }
  // end parameter object data
);
```

Note that if you want to use data included in event parameters when defining custom audiences, **key values must not contain any spaces**.

### Object Properties

You can include the following predefined object properties with any custom events and any [standard events that support them](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#standard-events). Format your parameter object data using JSON.

| Property Key | Value Type | Parameter Description |
| --- | --- | --- |
| `content_category` | string | Category of the page or product. |
| `content_ids` | array of integers or strings | Product IDs associated with the event, such as SKUs. Example: `['ABC123', 'XYZ789']`. |
| `content_name` | string | Name of the page/product. |
| `content_type` | string | Can be `product` or `product_group` based on the `content_ids` or `contents` being passed. If the IDs being passed in the `content_ids` or `contents` parameter are IDs of products, then the value should be `product`. If product group IDs are being passed, then the value should be `product_group`. |
| `contents` | array of objects | Array of JSON objects that contains the International Article Number (EAN) when applicable or other product or content identifier(s) associated with the event, and quantities and prices of the products. **Required**: `id` and `quantity`.<br>Example: `[{'id': 'ABC123', 'quantity': 2}, {'id': 'XYZ789', 'quantity': 2}]` |
| `currency` | string | Currency for the `value` specified. |
| `delivery_category` | string | Category of the delivery. Supported values:<br>`in_store` — Purchase requires customer to enter to the store.<br>`curbside` — Purchase requires curbside pickup<br>`home_delivery` — Purchase is delivered to the customer. |
| `num_items` | integer | Number of items when checkout was initiated. Used with the `InitiateCheckout` event. |
| `predicted_ltv` | integer, float | Predicted lifetime value of a subscriber as defined by the advertiser and expressed as an exact value. |
| `search_string` | string | String entered by the user for the search. Used with the `Search` event. |
| `status` | Boolean | Used with the `CompleteRegistration` event, to show the status of the registration. |
| `value` | integer or float | Required for purchase events or any events that utilize value optimization. A numeric value associated with the event. This must represent a monetary amount. |

### Custom Properties

If our predefined object properties don’t suit your needs, you can include your own, custom properties. Custom properties can be used with both standard and custom events, and can help you further define custom audiences.

For example, let’s say you wanted to track a visitor who purchased multiple products after having first compared them to other products. You could do this:

```
fbq('track', 'Purchase',
  // begin parameter object data
  {
    value: 115.00,
    currency: 'USD',
    contents: [\
      {\
        id: '301',\
        quantity: 1\
      },\
      {\
        id: '401',\
        quantity: 2\
      }],
    content_type: 'product',
    compared_product: 'recommended-banner-shoes',  // custom property
    delivery_category: 'in_store'
  }
  // end parameter object data
);
```

## Next Steps

Now that you’re tracking conversions, we recommend that you use them to define [custom audiences](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences), so you can optimize your ads for website conversions.

## Learn More

Learn more about conversion tracking with [Blueprint⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219710-technical-implementation-meta-pixel%3Fcontent_id%3Den4RqCL2PfBZrUU&h=AUAIz3AMlNryd-V2gnFMVsYcrYCKp_hWWm-cfuTpQrkXBSQzOk-XP5vANTBK8Yv_HsPhcutdfIUo97IIvQlMaC-H7XaUef2DgmBisXoLZKTiR0cHmMwX0iUqXCLph-DncZUytwTYL0sK-A).

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *