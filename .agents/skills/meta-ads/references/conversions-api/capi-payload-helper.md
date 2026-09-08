<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

# Payload Helper

Updated: Jan 25, 2023

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper.md)

Fill out the required and recommended data parameter fields to see how your payload should be structured when it’s sent to Facebook from your server.

Web, app, and physical store events shared using the Conversions API require specific parameters. The list of [required parameters is available here](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters).

Selected Product

selectedProduct

Website

​

Event Type Parameters

The fields [event\_name](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#event-name), [event\_time](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#event-time), and [action\_source](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#action-source)

are required for all events while event\_id is recommended for [deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events). Additionally, the fields [client\_user\_agent](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters#client-user-agent) and [event\_source\_url](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#event-source-url) are required for website events.

event\_name

Type: string

​

event\_time

Type: int

action\_source

Type: string

website

​

Add Event Type Parameters

* * *

Customer Information Parameters

Include at least one customer information parameter for each event you want to send. Facebook will use this data for the purposes described in its [Business Tools Terms](https://www.facebook.com/legal/technology_terms), including ads attribution and ads delivery optimization.

All customer information parameters should be hashed as SHA256, except for client IP address, client user agent, click ID, and browser ID. Any other customer information parameters that are not hashed are automatically rejected by Facebook.

Delete field

Email (em)∙ Optional

Type: string \| Must be hashed

Close

Normalize

Hash

[Add another value](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper#)

Delete field

Phone number (ph)∙ Optional

Type: string \| Must be hashed

Normalize

Hash

[Add another value](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper#)

Add Customer Information Parameters

* * *

Custom Data Parameters

Select custom parameters you want to use for ads attribution or ads delivery optimization, or create a new custom parameter.

Delete field

​

currency∙ Optional

Type: string

Close

Delete field

​

value∙ Optional

Type: float

Add Custom Data Parameters

* * *

Attribution Data Parameters

Select attribution parameters you want to use for ads attribution or ads delivery optimization.

Delete field

​

attribution\_share∙ Optional

Type: float

Add Attribution Data Parameters

* * *

Original Event Data Parameters

Select original event parameters you want to use for ads attribution or ads delivery optimization.

Delete field

​

event\_name∙ Optional

Type: string

Close

Delete field

​

event\_time∙ Optional

Type: int

Add Original Event Data Parameters

* * *

Generate Code

Get Code

`{
"data": [\
{\
"event_name": "Purchase",\
"event_time": 1788870274,\
"action_source": "website",\
"user_data": {\
"em": [\
"7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068"\
],\
"ph": [\
null\
]\
},\
"attribution_data": {\
"attribution_share": "0.3"\
},\
"custom_data": {\
"currency": "USD",\
"value": "142.52"\
},\
"original_event_data": {\
"event_name": "Purchase",\
"event_time": 1788870274\
}\
}\
]
}
`

You can add multiple values to most customer information parameters.
[Learn more](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)

Test this Payload

Send to Test Events

[Open Graph Explorer](https://developers.facebook.com/tools/explorer/?method=POST&path=%3CDATASET_ID%3E%2Fevents&data=[%7B%22event_name%22%3A%22Purchase%22%2C%22event_time%22%3A1788870274%2C%22action_source%22%3A%22website%22%2C%22user_data%22%3A%7B%22em%22%3A[%227b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068%22]%2C%22ph%22%3A[null]%7D%2C%22attribution_data%22%3A%7B%22attribution_share%22%3A%220.3%22%7D%2C%22custom_data%22%3A%7B%22currency%22%3A%22USD%22%2C%22value%22%3A%22142.52%22%7D%2C%22original_event_data%22%3A%7B%22event_name%22%3A%22Purchase%22%2C%22event_time%22%3A1788870274%7D%7D])

[Give feedback](https://developers.facebook.com/documentation/ads-commerce/conversions-api/payload-helper#)

* * *