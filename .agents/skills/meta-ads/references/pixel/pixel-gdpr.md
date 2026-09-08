<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# General Data Protection Regulation

Updated: Jul 14, 2023

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/implementation/gdpr.md)

The General Data Protection Regulation (GDPR) creates consistent data protection rules across Europe. It applies to companies (regardless of where they are based) who process personal data about individuals in the EU.

While many of the principles build on current EU data protection rules, the GDPR has a wider scope, more prescriptive standards and substantial fines. For example, it requires a higher standard of consent for using some types of data and broadens individuals’ rights with respect to accessing and porting their data.

Businesses who advertise with the Facebook companies can continue to use Facebook platforms and solutions in the same way they do today. Each company is responsible for ensuring their own compliance with the GDPR, just as they are responsible for compliance with the laws that apply to them today.

## Cookie Consent

Businesses may want to implement code that creates a banner and requires affirmative consent (for example, an “I agree” checkbox at the top of the page) to use the Pixel. If you already have a system in place that addresses this need, such as a tag manager, you can make this code optional.

Use the following API to pause sending Pixel fires to Facebook, and once cookie consent is granted, send Pixel fires to Facebook. You need to call revoke on every page.

```
fbq('consent', 'revoke');
fbq('consent', 'grant');
```

For example:

```
// Revoke consent before 'init' is called
fbq('consent', 'revoke');
fbq('init', '<your pixel ID>');
fbq('track', 'PageView');
```

```
// Once affirmative consent has been granted
fbq('consent', 'grant');
```

See our [Cookie Policy⁠](https://www.facebook.com/policies/cookies/) for details about the cookies used and the data received. The Meta Pixel receives these types of data:

**Http Headers** – Anything that is generally present in HTTP headers, a standard web protocol sent between any browser request and any server on the internet. This information may include data like IP addresses, information about the web browser, page location, document, referrer and person using the website.
**Pixel-specific Data** – Includes Pixel ID and the Facebook Cookie.
**Button Click Data** – Includes any buttons clicked by site visitors, the labels of those buttons and any pages visited as a result of the button clicks.
**Optional Values** – Developers and marketers can optionally choose to send additional information about the visit through [conversion tracking](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking). Example custom data events are conversion value, page type, and more.
**Form Field Names** – Includes website field names like ‘email’, ‘address’, ‘quantity’ for when you purchase a product or service. We don’t capture field values unless you include them as part of [Advanced Matching](https://developers.facebook.com/documentation/meta-pixel/advanced/advanced-matching), or [conversion tracking](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking).

## Learn more

[Advertiser Help⁠](https://www.facebook.com/business/help/225009134722945)
[Facebook’s GDPR microsite⁠](https://www.facebook.com/business/gdpr)

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *