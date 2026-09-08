<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

# Verifying Your Setup

Updated: Nov 24, 2025

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup.md)

This page details ways to verify that your setup is working correctly and is intended to help you to improve ad performance. The process of verifying your setup consists of:

[Verifying that events are received correctly](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup#verifying-that-events-are-received-correctly)
[Verifying that events are being sent as close to real-time as possible](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup#monitoring-event-freshness)
[Verifying that events are deduplicated correctly](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup#verifying-that-events-are-deduplicated-correctly)
[Verifying that events are matched to users with high accuracy](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup#verifying-that-events-are-matched-to-users-with-high-accuracy)

## Verifying that events are received correctly

### Monitoring events received

After you send your events, confirm that we have received them in the [Events Manager⁠](https://www.facebook.com/events_manager). You should be able to verify them within 20 minutes after they were sent.

Meta Blueprint Course: [Set Up, Implement and Verify the Conversions API⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219714-set-up-implement-verify-conversions-api%3Fcontent_id%3Ddtl2XpttDSQh8wk&h=AUBR82Vg2qbLnFY4XmYHse6lHRCrQ8AS9m8No68rxf_CMrE_NgE9yhma2qa9mLSFi1oQlxdLZeP_lmVQN3XdiTI284QXCxf6HlpNbzhHOMjVu3DQXfprNVrrc-JYjEOmTWSJh7-Ifry-hA)

To monitor events received in Events Manager, on the Data Sources page, click on the Pixel corresponding to the `PIXEL_ID` in your `POST` request. For more information, see [Business Help Center: Navigate Events Manager⁠](https://www.facebook.com/business/help/898185560232180).

Then, click **Overview**. Here, you will see the number of events we received before they are deduplicated, discarded due to consent controls and other policies, or processed. Under **Connection Method**, you see the channel in which that event was sent. You can click on each event type to get more specific information.

### Monitoring event freshness

To help Facebook optimize your ads, we recommend that you minimize the time between when an event occurs (represented by the `event_time` parameter) and when it is shared with Facebook to be as close to real-time as possible.

You can use Events Manager to monitor event freshness. In the **Overview** page for a given Pixel, click on the Event Details button for an event to get more specific information. On this page, navigate to the **Event Freshness** tab. In this tab, you can see the average event delay time on a scale from Real Time to Weekly.

## Verifying that events are deduplicated correctly

For optimal ad performance, we recommend that advertisers implement the Conversions API alongside their Meta Pixel. When advertisers do so, they must set up a deduplication method to help ensure that the ad delivery system is able to differentiate between distinct and overlapping events. Learn more about [deduplication](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events).

You can use Events Manager to monitor the percentage of events that were deduplicated. In the **Overview** page for a given Pixel, click on the **Event Details** button for an event type to get more specific information. On this page, navigate to the **Event Deduplication** tab.

This tab shows the following information:

**Rate of Events Deduplicated**: This is the percentage of events that have been deduplicated from each event source. Higher percentages are better, and a warning will appear when your deduplication rate is too low. You may be able to improve deduplication rates by adding more deduplication parameters to the event.
**Rate of Deduplication Key Usage**: This is the percentage of events from each source that contained each dedupe key. Overlap is the percentage of events with a given dedupe key received from both sources (as a percentage of the source with the fewest events received). Having low Overlap means that the implementation is either sending non-unique dedupe keys from one/either source or sending events with a dedupe key from only one source.

## Verifying that events are matched to users with high accuracy

When your events are matched to people with a Facebook account, your events can be better utilized for ad attribution and optimization. In Events Manager, you can monitor Event Match Quality, a measure of how effective your server event’s customer information parameters may be at matching events to a Facebook account.

Event Match Quality is scored from 1 to 10. You can monitor Event Match Quality in two ways:

Navigate to the **Overview** page for a given Meta Pixel with the Conversions API
Use the [Setup Quality API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/dataset-quality-api)

Having a high Event Match Quality score can help decrease your cost per action. Where possible, we typically recommend that you aim for an Event Match Quality score of 6.0 or higher. You can click on Event Match Quality score to view additional details and recommendations for improving Event Match Quality. Learn more about additional [best practices for Event Match Quality⁠](https://www.facebook.com/business/help/308855623839366?id=818859032317965).

## See Also

[Setup Quality API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/dataset-quality-api)
Meta Blueprint: [Set Up, Implement and Verify the Conversions API⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fpath%2F219714-set-up-implement-verify-conversions-api%3Fcontent_id%3Ddtl2XpttDSQh8wk&h=AUBR82Vg2qbLnFY4XmYHse6lHRCrQ8AS9m8No68rxf_CMrE_NgE9yhma2qa9mLSFi1oQlxdLZeP_lmVQN3XdiTI284QXCxf6HlpNbzhHOMjVu3DQXfprNVrrc-JYjEOmTWSJh7-Ifry-hA)

* * *