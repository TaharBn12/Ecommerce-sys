<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# Advanced matching - Meta Pixel

Updated: Dec 21, 2023

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/advanced/advanced-matching.md)

This document explains how to manually implement advanced matching for [tracked conversion events](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking) using the Meta Pixel.

Please visit the [Privacy and Data Use Guide⁠](https://www.facebook.com/business/m/privacy-and-data#Data-Use-&-Ads) to learn what data is sent when using the Meta Pixel.

To [automatically implement advanced matching⁠](https://www.facebook.com/business/help/1993001664341800) use the [Events Manager⁠](https://business.facebook.com/events_manager/).

## Implementation

To use advanced matching, format the visitor’s data as a JSON object and include it in the [pixel base code `fbq('init')` function call](https://developers.facebook.com/documentation/meta-pixel/get-started#base-code) as a third parameter.

Be sure to place advanced matching parameters in the pixel base code or the values will not be treated as manual advanced matching values.

For example, if your pixel ID was `283859598862258`, you could do this:

```
fbq('init', '283859598862258', {
  em: 'email@email.com',         //Values will be hashed automatically by the pixel using SHA-256
  fn: 'first_name',
  ln: 'last_name'
  ...
});
```

**Note:** We accept both lowercase unhashed and normalized SHA-256 hashed email addresses in your function calls

#### Sending More Hashed Values

You can use the `<img>` tag to pass your own visitor data if you format and hash your user data using a SHA-256 hashing algorithm.

The following is an example of passing hashed user email, first name, and last name:

```
<img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr/?id=PIXEL_ID&ev=Purchase
  &ud[em]=f1904cf1a9d73a55fa5de0ac823c4403ded71afd4c3248d00bdcd0866552bb79
  &ud[fn]=4ca6f6d5a544bf57c323657ad33aae1a019c775518cf4414beedb86962aea7c1
  &ud[ln]=41f3e15ff8a4e4117da46465954304497ef29bdf35afaa9e36d527864d24c266
  &cd[value]=0.00
  &cd[currency]=USD" />
```

## Reference

| User Data | Parameter | Format | Example |
| --- | --- | --- | --- |
| Email | `em` | Unhashed lowercase or hashed SHA-256 | `jsmith@example.com` or `6e3913852f512d76acff15d1e402c7502a5bbe6101745a7120a2a4833ebd2350` |
| First Name | `fn` | Lowercase letters | `john` |
| Last Name | `ln` | Lowercase letters | `smith` |
| Phone | `ph` | Digits only including country code and area code | `16505554444` |
| External ID | `external_id` | Any unique ID from the advertiser, such as loyalty membership ID, user ID, and external cookie ID. | `a@example.com` |
| Gender | `ge` | Single lowercase letter, `f` or `m`, if unknown, leave blank | `f` |
| Birthdate | `db` | Digits only with birth year, month, then day | `19910526` for May 26, 1991. |
| City | `ct` | Lowercase with any spaces removed | `menlopark` |
| State or Province | `st` | Lowercase two-letter state or province code | `ca` |
| Zip or Postal Code | `zp` | String | `94025` |
| Country | `country` | Lowercase two-letter country code | `us` |

## Learn More

Meta Blueprint course: [Advanced Matching for Websites⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F211540-advanced-matching-for-websites%3Fcontent_id%3DXmPXIuAmW8z20zl&h=AUD30n1e6Osun6LR8vOP7Gq2gmJRPexEsQu9xHCWfFpOrXRzGvoqLFFBvNu7M7eDjIEA8ohW1VMMc9STZAOnF9bQ5W2T1BkS4q0zY2Ya0oNsSgYMJB1gGjS3wGRo5ZQ1tRwpmcUOoLWLtA).

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *