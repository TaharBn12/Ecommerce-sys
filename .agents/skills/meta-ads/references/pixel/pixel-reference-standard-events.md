<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

Was this helpful?

# Meta Pixel API reference

Updated: Jul 16, 2024

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/reference.md)

## Standard Events

You can use the Meta Pixel’s `fbq('track')` function to track the following [standard events](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking#standard-events). Standard events also support [parameter](https://developers.facebook.com/documentation/meta-pixel/reference#object-properties) objects with specific object properties, which allow you to include detailed information about an event.

If you’re implementing the Meta Pixel alongside the [Conversions API](https://developers.facebook.com/documentation/ads-commerce/conversions-api), we recommend you include the `eventID` parameter as a fourth parameter to the `fbq('track')` function. See the [Deduplicate Pixel and Server Events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events) documentation for more information.

| Event Name | Event Description | Object Properties | Promoted Object custom\_event\_type value |
| --- | --- | --- | --- |
| `AddPaymentInfo` | When payment information is added in the checkout flow. _A person clicks on a save billing information button._ | `content_ids`, `contents`, `currency`, `value`<br>_Optional._ | ADD\_PAYMENT\_INFO |
| `AddToCart` | When a product is added to the shopping cart.<br>_A person clicks on an add to cart button._ | `content_ids`, `content_type`, `contents`, `currency`, `value`<br>_Optional._<br>_Required for Advantage+ catalog ads:_<br>_`contents`_ | ADD\_TO\_CART |
| `AddToWishlist` | When a product is added to a wishlist.<br>_A person clicks on an add to wishlist button._ | `content_ids`, `contents`, `currency`, `value`<br>_Optional._ | ADD\_TO\_WISHLIST |
| `CompleteRegistration` | When a registration form is completed.<br>_A person submits a completed subscription or signup form._ | `currency`, `value`<br>_Optional._ | COMPLETE\_REGISTRATION |
| `Contact` | When a person initiates contact with your business via telephone, SMS, email, chat, etc.<br>_A person submits a question about a product._ | _Optional._ | CONTACT |
| `CustomizeProduct` | When a person customizes a product.<br>_A person selects the color of a t-shirt._ | _Optional._ | CUSTOMIZE\_PRODUCT |
| `Donate` | When a person donates funds to your organization or cause.<br>_A person adds a donation to the Humane Society to their cart._ | _Optional._ |  |
| `FindLocation` | When a person searches for a location of your store via a website or app, with an intention to visit the physical location.<br>_A person wants to find a specific product in a local store._ | _Optional._ | FIND\_LOCATION |
| `InitiateCheckout` | When a person enters the checkout flow prior to completing the checkout flow.<br>_A person clicks on a checkout button._ | `content_ids`, `contents`, `currency`, `num_items`, `value`<br>_Optional._ | INITIATE\_CHECKOUT |
| `Lead` | When a sign up is completed.<br>_A person clicks on pricing._ | `currency`, `value`<br>_Optional._ | LEAD |
| `Purchase` | When a purchase is made or checkout flow is completed.<br>_A person has finished the purchase or checkout flow and lands on thank you or confirmation page._ | `content_ids`, `content_type`, `contents`, `currency`, `num_items`, `value`<br>_**Required:**`currency` and `value`_<br>_Required for Advantage+ catalog ads:_<br>_`contents` or `content_ids`_ | PURCHASE |
| `Schedule` | When a person books an appointment to visit one of your locations.<br>_A person selects a date and time for a tennis lesson._ | _Optional._ | SCHEDULE |
| `Search` | When a search is made.<br>_A person searches for a product on your website._ | `content_ids`, `content_type`, `contents`, `currency`, `search_string`, `value`<br>_Optional._<br>_Required for Advantage+ catalog ads:_<br>_`contents` or `content_ids`_ | SEARCH |
| `StartTrial` | When a person starts a free trial of a product or service you offer.<br>_A person selects a free week of your game._ | `currency`, `predicted_ltv`, `value`<br>_Optional._ | START\_TRIAL |
| `SubmitApplication` | When a person applies for a product, service, or program you offer.<br>_A person applies for a credit card, educational program, or job._ | _Optional._ | SUBMIT\_APPLICATION |
| `Subscribe` | When a person applies to a start a paid subscription for a product or service you offer.<br>_A person subscribes to your streaming service._ | `currency`, `predicted_ltv`, `value`<br>_Optional._ | SUBSCRIBE |
| `ViewContent` | A visit to a web page you care about (for example, a product page or landing page). `ViewContent` tells you if someone visits a web page’s URL, but not what they see or do on that page.<br>_A person lands on a product details page._ | `content_ids`, `content_type`, `contents`, `currency`, `value`<br>_Optional._<br>_Required for Advantage+ catalog ads:_<br>_`contents` or `content_ids`_ | VIEW\_CONTENT |

## Object Properties

You can include the following predefined object properties with any custom events, and any standard events that support them. Format your parameter object data using JSON. Learn more about event parameters with [Blueprint⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebookblueprint.com%2Fstudent%2Fcollection%2F240330%2Fpath%2F210140%3Fcontent_id%3D9yCDpJgXbYOg8OK&h=AUAl3lb85HIJtMfiMG6F3O6n6cVm73kdLZ561aG9VnIGMkmlLyt-z-mEHvogBoT2a-huqv8Rwm68Dp9e3T25MGA4rbbWM-cdzRFFkKEsX2QoxD5-Axv-o-0cJxryDDnrZxaqRHyrDsMt_g).

| Property Key | Value Type | Parameter Description |
| --- | --- | --- |
| `content_category` | String | Category of the page/product.<br>_Optional._ |
| `content_ids` | Array of integers or strings | Product IDs associated with the event, such as SKUs (e.g. `['ABC123', 'XYZ789']`). |
| `content_name` | String | Name of the page/product.<br>_Optional._ |
| `content_type` | String | Either `product` or `product_group` based on the `content_ids` or `contents` being passed. If the IDs being passed in `content_ids` or `contents` parameter are IDs of products, then the value should be `product`. If product group IDs are being passed, then the value should be `product_group`.<br>If no `content_type` is provided, Meta will match the event to every item that has the same ID, independent of its type. |
| `contents` | Array of objects | An array of JSON objects that contains the quantity and the International Article Number (EAN) when applicable, or other product or content identifier(s). `id` and `quantity` are the required fields. e.g. `[{'id': 'ABC123', 'quantity': 2}, {'id': 'XYZ789', 'quantity': 2}]`. |
| `currency` | String | The currency for the `value` specified. |
| `num_items` | Integer | Used with `InitiateCheckout` event. The number of items when checkout was initiated. |
| `predicted_ltv` | Integer, float | Predicted lifetime value of a subscriber as defined by the advertiser and expressed as an exact value. |
| `search_string` | String | Used with the `Search` event. The string entered by the user for the search. |
| `status` | Boolean | Used with the `CompleteRegistration` event, to show the status of the registration.<br>_Optional._ |
| `value` | Integer or float | The value of a user performing this event to the business. |

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *