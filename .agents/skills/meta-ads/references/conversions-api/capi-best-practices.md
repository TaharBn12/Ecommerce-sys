<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

Was this helpful?

# Best Practices - Conversions API

Updated: Jun 28, 2026

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices.md)

Use these best practices as general recommendations to make the most effective use of the Conversions API. Follow the [implementation](https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices#capi-implement) and [post-implementation](https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices#post-implementation) recommendations to ensure a smooth integration and optimal results when sharing data with Meta.

In addition to the following best practices, [watch this video](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#video) for a more hands-on tutorial on using the Conversions API. The video guides you through how to:

[Send Requests](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#send)
Handle [Dropped Events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#dropped-events), [Event Transaction Time](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#event-transaction-time), and [Batch Requests](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#batch-requests)
[Verify Events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#verify)
Use the [Test Events Tool](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api#testEvents)

Web, app, and physical store events shared using the Conversions API require specific parameters. The list of [required parameters is available here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters).

## Implementation

When setting up your campaign, simplify the account structure and use the following established campaign best practices:

Implement [Learning Phase best practices⁠](https://www.facebook.com/business/help/112167992830700?id=561906377587030)
Refrain from making [significant campaign edits⁠](https://www.facebook.com/business/help/316478108955072?id=561906377587030)
[Minimize Auction Overlap⁠](https://www.facebook.com/business/help/537699989762051?id=561906377587030)
Select [Automatic Placements⁠](https://www.facebook.com/business/help/965529646866485?id=802745156580214) and [Campaign Budget Optimization⁠](https://www.facebook.com/business/help/153514848493595?id=629338044106215)
[Choose the right bid strategy⁠](https://www.facebook.com/business/help/1619591734742116?id=2196356200683573) based on your business goals

### Set up redundant events

Use the Conversions API in addition to the Meta Pixel, and share the same events using both tools. This is a _redundant event setup_. For example, if you share `Purchase`, `Initiate Checkout`, and `Contact` events using the Meta Pixel, you should also share those same events from your server using the Conversions API.

The Conversions API allows you to share website events that the Pixel may lose due to network connectivity issues or page loading errors. The Conversions API can also be used to share other types of important events and data that occur offline or at a later time that the Pixel cannot capture.

### Ensure redundant events can be deduplicated

When sending redundant events using the Meta Pixel and Conversions API, ensure that both events use the identical `event_name` and that either `event_id` or a combination of `external_id` and `fbp` are included. Include all of these parameters to help Meta properly deduplicate events and reduce double reporting of identical events. [Learn more about deduplication, when it’s necessary and how to set it up.⁠](https://www.facebook.com/business/help/823677331451951)

### Send required and recommended parameters

The following [server event](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event) and [customer information](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters) parameters are required:

| Parameter | Type | When Required |
| --- | --- | --- |
| [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) | Server event | All events |
| [`event_source_url`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-source-url) | Server event | All website events |
| [`client_user_agent`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#client-user-agent) | Customer information | All website events |

By using the Conversions API, you agree that the [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) parameter is accurate to the best of your knowledge. Also include the `external_id` and `event_id` event parameters for all events.

Sending additional [customer information parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters) may help increase Event Match Quality. You can use only matched events for ads attribution and ad delivery optimization. Higher matching quality produces better results. You cannot use unmatched events for attribution or ad delivery optimization, but you can still use them for basic measurement. Examples of high-quality customer information parameters include:

email address (`em`)
IP address (`client_ip_address`)
name (`fn` and `ln`)
phone number (`ph`)

### Baseline requirements for matching

Following the release of Graph API version 13.0, Meta will be updating the baseline requirements for which combinations of customer information parameters are considered valid with a Conversions API event. These changes will help Meta provide better feedback for when an event has a combination of customer information parameters that is so broad that it is unlikely to be effective for matching.

An event is considered invalid if it only includes customer information parameters that consist of one of the following combinations, (or a subset thereof).

`ct` \+ `country` \+ `st` \+ `zp` \+ `ge` \+ `client_user_agent`
`db` \+ `client_user_agent`
`fn` \+ `ge`
`ln` \+ `ge`

For example, if an event had only the customer information parameters `ge`, `ct`, `st`, and `country` (this could correspond to a man in Menlo Park, California, USA), it would be rejected because those customer information parameters are a subset of one of the above combinations.

### Ensure `fbp` and `fbc` parameters are refreshed

The [`fbp`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc) and [`fbc`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc) parameters are cookie values typically set on your site visitors’ browsers in connection with Meta’s first-party cookie solution, and are subject to change. If you send them as [user parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters), you should regularly refresh their values.

These values will be set as first-party cookies when the Meta Pixel is implemented on your website and can be retrieved for use in Conversions API requests.

### Share events closer to real time

Sharing events when they happen can help your campaigns achieve the best results. You can share server events using the Conversions API in real time or in [batches](https://developers.facebook.com/docs/graph-api/making-multiple-requests) close to real time.

### Use test events

Use the [Test Events tool⁠](https://www.facebook.com/business/help/1624255387706033) to validate your Conversions API connection. Typically, developers should use their own customer information parameters (for example, name, email address, phone number) for test events, because these events may get discarded if they don’t match a Facebook or Meta account.

You can use the Test Events tool to:

Verify that you’ve set up your server events correctly and Meta has received them.
Verify that you’ve deduplicated events correctly by seeing which events were processed and deduplicated.
Debug any unusual activity.

[Learn how to test your server events using the Test Events tool.⁠](https://www.facebook.com/business/help/1624255387706033)

### Use Payload Helper

Fill out the required and recommended data parameter fields in the [Payload Helper](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper) tool to see how your payload should be structured and to get recommendations for which parameters to include.

### Use our Business SDK

The [code samples](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api) in our documentation include Business SDK examples in Python, Java, Ruby, PHP, and Node. They can save some development effort, such as hashing user parameters, which is done automatically in the Business SDK.

If you are not planning to use the Business SDK, implement [hashing](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters#normalize-and-hash).

### Use the Conversions API for offline events

The Conversions API [supports all offline events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/offline-events) and should be used as the comprehensive container for these types of events. Examples include physical store sales, phone calls, actions taken on devices (such as smart TVs or game consoles), and offline subscriptions.

When sending offline events, be sure to include the [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) event parameter, and choose the appropriate value (should not be `website`). The action source is required to determine the campaign objectives for which the event is intended.

By using the Conversions API, you agree that the [`action_source`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#action-source) parameter is accurate to the best of your knowledge.

## Additional best practices for partners

### Agencies: send `partner_agent` string

Partners or agencies that share events on behalf of their advertisers should send a unique [`partner_agent`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/set-up-conversions-api-as-a-platform#attribute-events-to-your-platform-using-the-partner_agent-field) string, including platform name as documented. If applicable, work with your dedicated Meta representative to decide on a suitable agent string.

### Website platforms: onboarding advertisers

By default, website platform partners may consider whether to offer Conversions API selectively or to opt-in advertisers. The Meta Pixel and Conversions API share the same business terms. Opt-in your customers to also share their data using the Conversions API when they set up the Meta Pixel. Using both tools provides more complete and reliable data sharing. Provide your customers with information about both the Conversions API and Meta Pixel to help inform their choice.

## Post-implementation

### Check Event Match Quality

If you share server events using the Conversions API, you can see the Event Match Quality (EMQ) for each event in Events Manager. An event’s EMQ score (out of 10) indicates how effective your server event’s customer information may be at matching it to a Facebook or Meta account. Learn more about EMQ best practices [here⁠](https://www.facebook.com/business/help/765081237991954?id=818859032317965).

Event Match Quality is currently available only for web events. For other event types such as offline and physical store events, app events, conversion leads or any integration under alpha or beta stages, contact your Meta representative for guidance on improving event match quality.

### Run a test

When using the Conversions API, test and optimize your Meta advertising strategy. Some testing options include:

**[Conversion Lift Study](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lift-studies)**: Understand the incremental performance impact of using server events.

**[Split Testing](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/split-testing)**: Understand which campaign strategy achieves the best and most efficient outcomes to optimize performance.

## Learn more

[Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api)
[Conversions API End-to-End Implementation](https://developers.facebook.com/documentation/ads-commerce/conversions-api/guides/end-to-end-implementation)
[`fbp` and `fbc` parameters, Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc)
[Payload Helper, Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper)
[Parameters, Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters)
[Offline Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/offline-events)
[Conversions API `partner_agent` string](https://developers.facebook.com/documentation/ads-commerce/conversions-api/set-up-conversions-api-as-a-platform#attribute-events-to-your-platform-using-the-partner_agent-field)
[Deduplication for Meta Pixel and Conversions API Events, Help Center⁠](https://www.facebook.com/business/help/823677331451951)
[Batch Requests](https://developers.facebook.com/docs/graph-api/making-multiple-requests)
[Test Your Server Events Using the Test Events Tool, Help Center⁠](https://www.facebook.com/business/help/1624255387706033)
[Meta Business SDK](https://developers.facebook.com/docs/business-sdk)

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *