<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# Data processing options for US users - Meta Pixel

Updated: May 1, 2023

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/implementation/data-processing-options.md)

Starting June 1, 2023, Limited Data Use for people in Colorado and Connecticut via Meta Business Tools and Meta Audience Network will be effective. Starting June 1, 2023, Limited Data Use for people in California via customer list custom audiences will also be effective. To give businesses time to prepare, Limited Data Use’s expanded features are available to explore as of May 1, 2023, but won’t go into effect until June 1, 2023. Please note that any Limited Data Use flag sent for these updated states and products prior to June 1, 2023, will not be implemented.

Limited Data Use is a data processing option that gives you more control over how your data is used in Meta’s systems and better supports your compliance efforts with various US state privacy regulations.
To utilize this feature, you must proactively enable Limited Data Use. When Meta receives data with Limited Data Use enabled from people in the states where Limited Data Use applies, we will process that data in accordance with our role as a service provider or processor, as applicable, and limit the use of that data as specified in our [State-Specific Terms⁠](https://www.facebook.com/legal/terms/state-specific).

For [Business Tools⁠](https://www.facebook.com/help/331509497253087) and Audience Network, Limited Data Use is available only for people in California, Colorado or Connecticut. If a business enables Limited Data Use but does not set the location parameters to US and California, Colorado or Connecticut, we will determine if the event is from one of those states. If Limited Data Use is enabled for an event in California, Colorado or Connecticut, we will process data in accordance with our role as a service provider or processor and limit the use of that data in accordance with our [State-Specific Terms⁠](https://www.facebook.com/legal/terms/state-specific).

Businesses may notice an impact to campaign performance and effectiveness, and retargeting and measurement capabilities will be limited when Limited Data Use is enabled.

## Implementation

| Implementation | Adding Data Processing Options |
| --- | --- |
| Browser Pixel | Update Pixel initialization code to specify the `dataProcessingOptions` method before you call `fbq('init')`.<br>To explicitly not enable Limited Data Use (LDU):<br>```<br>fbq('dataProcessingOptions', []);<br>fbq('init', '{pixel_id}');<br>fbq('track', 'PageView');<br>```<br>To enable LDU and have Meta perform geolocation:<br>```<br>fbq('dataProcessingOptions', ['LDU'], 0, 0);<br>```<br>To enable LDU and specify the location, e.g., for California:<br>```<br>fbq('dataProcessingOptions', ['LDU'], 1, 1000);<br>``` |
| Image tag | Add the following to the Pixel image tag:<br>`dpo`: data processing options<br>`dpoco`: data processing options country<br>`dpost`: data processing options state<br>See [Reference](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/data-processing-options#reference) for accepted values.<br>To explicitly not enable LDU, pass an empty value for the `dpo` parameter:<br>```<br><img src="https://www.facebook.com/tr?id={pixel_id}&ev=Purchase&dpo=" /><br>```<br>To enable LDU and have Meta perform geolocation:<br>```<br><img src="https://www.facebook.com/tr?id={pixel_id}&ev=Purchase&vdpo=LDU&dpoco=0&dpost=0" /><br>```<br>To enable LDU and manually specify the location, e.g., for California:<br>```<br><img src="https://www.facebook.com/tr?id={pixel_id}&ev=Purchase&dpo=LDU&dpoco=1&dpost=1000" /><br>``` |

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *