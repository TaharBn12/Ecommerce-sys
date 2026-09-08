<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# Custom Audiences

Updated: Jan 27, 2022

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences.md)

If you are [tracking conversions](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking), you can segment your website visitors into groups based on the actions they have taken on your website. These groups are called **custom audiences**. Once you have defined a custom audience, you can [optimize your ad sets⁠](https://www.facebook.com/business/help/1082085278508457) to target other Facebook users who match that audience’s criteria.

### Requirements

The Pixel’s [base code](https://developers.facebook.com/documentation/meta-pixel/get-started#base-code) must already be installed and tracking [standard events](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#standard-events), [custom events](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#custom-events), or [custom conversions](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#custom-conversions).
You must have access to the [Facebook Ads Manager⁠](https://www.facebook.com/adsmanager).

## Defining Custom Audiences

Before you can define a custom audience, make sure the Events Manager is tracking your events or custom conversions correctly, otherwise you will not be able to select them in the Events Manager when setting up a custom audience.

### Standard and Custom Events

To define a custom audience from a standard or custom event, follow the instructions in our [About Custom Audiences from your website⁠](https://www.facebook.com/business/help/1474662202748341) Business Manager help document.

### Custom Conversions

To create an audience from a [custom conversion](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#custom-conversions), follow the instructions in our [About Custom Audiences from your website⁠](https://www.facebook.com/business/help/1474662202748341) Business Manager help document, but select **People who visited specific webpages** at step #4. Use the same URL criteria that you used to define your custom conversion.

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *