<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

Was this helpful?

# Handling Duplicate Pixel and Conversions API Events

Updated: Jun 28, 2026

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events.md)

For optimal ad performance, we recommend that advertisers implement the Conversions API alongside their Meta Pixel. We call this a “redundant setup” and detail more about this recommended approach [here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/guides/end-to-end-implementation#pick-your-integration-type).

When advertisers use a redundant setup, they must set up a deduplication method to ensure that the ad delivery system is able to differentiate between distinct and overlapping events. This document describes multiple deduplication method options to help Facebook deduplicate your events.

Advertisers who do not send the same event twice via both the Conversions API and Meta Pixel do not need to set up deduplication for those events.

The Conversions API now enables advertisers to send web, app, and physical store events to Meta through a single endpoint rather than across multiple. Learn more about [the Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api).

## Event deduplication options

Facebook tries to deduplicate identical events sent through Meta Pixel and the Conversions API. We have two ways of deduplicating your events:

### Event ID and event name (recommended)

#### Required parameters

For this approach, the `event_id` parameter is added to your events from both the Conversions API and the browser Pixel. The `event_id` parameter is an identifier that can uniquely distinguish between similar events. Read more about [the `event_id` parameter](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event#event-id).

#### Approach description

We determine if events are identical based on their **ID** and **name**. So, for an event to be deduplicated:

In corresponding events, a Meta Pixel’s `eventID` must match the Conversion API’s `event_id`.
In corresponding events, a Meta Pixel’s `event` must match the Conversion API’s `event_name`.

Once the events are received, we employ a number of strategies to deduplicate between the events which may help improve optimization and measurement. If server and browser events do not differ meaningfully in their content, we generally prefer the event that is received first.

Note that the `eventID` parameter for the Pixel is the fourth argument in the `fbq` track call.

**Example**

```
fbq('track', 'Purchase', {value: 12, currency: 'USD'}, {eventID: 'EVENT_ID'});
```

### FBP or external ID

#### Required parameters

For this approach, you must use `event_name`, `fbp` and/or `external_id` consistently across browser and server events. See [Customer Information Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters) for more information about the `external_id` and `fbp` parameters.

#### Approach description

If you have configured the `external_id` and/or `fbp` parameters to be passed via both browser and server, we take care to remove duplicate events automatically. This is how the process works:

You send us a browser event with `event_name` and `fbp` and/or `external_id`.
Then, you send us a server event with `event_name` and `fbp` and/or `external_id`.
We compare the server event with the previously sent browser event. Specifically, we compare the `event_name` and `fbp` and/or `external_id` combinations.
We employ a number of strategies to deduplicate between the events which may help improve optimization and measurement. If server and browser events do not differ meaningfully in their content, we generally prefer the event that is received first.

#### Approach limitations

This deduplication method:

Generally, it only works for deduplicating events sent first from the browser and then through the server. Server events will not be discarded if a browser event has not been received in the past 48 hours, even if an identical browser event arrives after the server event
Does not deduplicate events when only using one event source, that is browser-only or server-only. If you send us two consecutive browser events with the same information, we do not discard either. If you send us two consecutive server events with the same information, we do not discard either.

## Setting up deduplication on the browser Pixel

For better matching, we need accurate information from your events coming through both Meta Pixel and the Conversions API:

The `eventID` inside the optional `eventData` parameter should be a unique value. Depending on your Meta Pixel implementation, you can use:

`track` to send the event for all Pixels on the page

```
fbq('track', 'Purchase', {value: 12, currency: 'USD'}, {eventID: 'EVENT_ID'});
```

`trackSingle` to send the event for one Pixel

```
fbq('trackSingle', 'SPECIFIC_PIXEL_ID', 'Purchase', {value: 12, currency: 'USD'}, {eventID: 'EVENT_ID'});
```

An image Pixel tag with the `eid` parameter

```
<img src="https://www.facebook.com/tr?id=PIXEL_ID&ev=Purchase&eid=EVENT_ID"/>
```

If the event you are sharing does not contain parameters such as value and currency, you can set it up as follows:

```
fbq('track', 'Lead', {}, {eventID: 'EVENT_ID'});
```

The `eventID` from the Meta Pixel must match the `event_id` in the corresponding event coming from the Conversions API.

If we find the same server key combination (`event_id` and `event_name`) **and** browser key combination (`eventID` and `event`) sent to the same Pixel ID within 48 hours, we discard the subsequent events.

If you are sending us your events via both browser and the Conversions API along with matching `event_ids`, keep in mind that events are only deduplicated if they are received within 48 hours of when we receive the first event with a given `event_id`.

## Verifying your deduplication setup

Learn how to verify your deduplication and event merging setup in the [Verifying Your Setup](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup) documentation.

## Learn more

[Parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters)
[Payload Helper](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper)

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *