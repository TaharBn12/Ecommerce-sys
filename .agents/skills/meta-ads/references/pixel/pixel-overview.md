<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# Meta Pixel

Updated: Nov 15, 2023

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel.md)

The Meta Pixel is a snippet of JavaScript code that allows you to track visitor activity on your website. It works by loading a small library of functions which you can use whenever a site visitor takes an action (called an **event**) that you want to track (called a **conversion**). [Tracked conversions](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking) appear in the [Ads Manager⁠](https://www.facebook.com/adsmanager) where they can be used to measure the effectiveness of your ads, to define [custom audiences](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences) for ad targeting, for [Advantage+ catalog ads](https://developers.facebook.com/docs/facebook-pixel/implementation/dynamic-ads) campaigns, and to analyze that effectiveness of your website’s conversion funnels.

The Meta Pixel can collect the following data:

**Http Headers** – Anything that is generally present in HTTP headers, a standard web protocol sent between any browser request and any server on the internet. This information may include data like IP addresses, information about the web browser, page location, document, referrer and person using the website.
**Pixel-specific Data** – Includes Pixel ID and the Facebook Cookie.
**Button Click Data** – Includes any buttons clicked by site visitors, the labels of those buttons and any pages visited as a result of the button clicks.
**Optional Values** – Developers and marketers can optionally choose to send additional information about the visit through Custom Data events. Example custom data events are [conversion value, page type and more](https://developers.facebook.com/documentation/meta-pixel/implementation/custom-audiences).
**Form Field Names** – Includes website field names like `email`, `address`, `quantity`, etc., for when you purchase a product or service. We don’t capture field values unless you include them as part of [Advanced Matching](https://developers.facebook.com/documentation/meta-pixel/advanced/advanced-matching) or optional values.

## Documentation Contents

### [Get Started](https://developers.facebook.com/documentation/meta-pixel/get-started)

A short tutorial on adding the Pixel base code to your webpages.

### [Guides](https://developers.facebook.com/documentation/meta-pixel/guides)

Use case based guides to help you perform specific actions.

### [Reference](https://developers.facebook.com/documentation/meta-pixel/reference)

Product specifications and endpoint references.

### [Support](https://developers.facebook.com/documentation/meta-pixel/support)

Solutions to common problems, troubleshooting tips, and tools.

## Learn more

Track User activity in a mobile app using [Facebook App Events](https://developers.facebook.com/documentation/app-events)
[Apple’s iOS 14 Requirements for Meta Pixel⁠](https://www.facebook.com/business/help/721422165168355)

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *