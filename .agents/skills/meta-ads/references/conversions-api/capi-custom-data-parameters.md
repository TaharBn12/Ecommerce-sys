<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Ads and Commerce

Was this helpful?

# Standard Parameters

Updated: Nov 17, 2025

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/custom-data.md)

This table lists all standard parameters users can send to Meta.

| Website Standard Parameters | App Standard Parameters | Offline Standard Parameters | Description |
| --- | --- | --- | --- |
| `availability` | `fb_availability` | `availability` | Value must be `available_soon`, `for_rent`, `for_sale`, `off_market`, `recently_sold` or `sale_pending`. |
| `body_style` | `fb_body_style` | `body_style` | Body style of the vehicle: `CONVERTIBLE`, `COUPE`, `HATCHBACK`, `MINIVAN`, `TRUCK`, `SUV`, `SEDAN`, `VAN`, `WAGON`, `CROSSOVER`, `OTHER`. |
| `checkin_date` | `fb_checkin_date` | `checkin_date` | The date the user is wanting to check-in to the hotel in the hotel’s time-zone. We accept dates in `YYYYMMDD`, `YYYY-MM-DD`, `YYYY-MM-DDThh:mmTZD` and `YYYY-MM-DDThh:mm:ssTZD`. |
| `city` | `fb_city` | `city` | Provide the city of the location from user intent. |
| `condition_of_vehicle` | `fb_condition_of_vehicle` | `condition_of_vehicle` | Condition of vehicle. |
| `content_ids` | `fb_content_ids` | `content_ids` | The content IDs associated with the event, such as product SKUs for items in an `AddToCart` event. |
| `content_type` | `fb_content_type` | `content_type` | Should be set to `product` or `product_group`:<br>Use `product` if the keys you send represent products. Sent keys could be `content_ids` or `contents`.<br>Use `product_group` if the keys you send in `content_ids` represent product groups. Product groups are used to distinguish products that are identical but have variations such as color, material, size or pattern. |
| `contents` | `fb_contents` | `contents` | A list of JSON objects that contain the product IDs associated with the event plus information about the products.<br>Available fields: `id`, `quantity`, `item_price`, `delivery_category`. |
| `country` | `fb_country` | `country` | Provide the country of the location from user intent. |
| `currency` | `fb_currency` | `currency` | Required for purchase events.<br>The currency for the `value` specified, if applicable. Currency must be a valid [ISO 4217⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FISO_4217%3Ffbclid%3DIwAR2qARpy3ufnmcEY-sVHvTzUA1AsFOsLYdNsrZP6UYAMRt6NVM5SAhfzfJg&h=AUBYDlnZW9N6Dv7h1E_SI--rWxc2CUQSj3OmfukSS4GYEWVqnI13x7H-rJCMbNuQeepc2Ct4OAtZt7BxeEbNFaSbzF0rj7w_jyju5kx3SNdUbueKbHkdlG0_e_1uAlgo3TUg31BVqCfLQg) three-digit currency code. |
| `delivery_category` | `fb_delivery_category` | `delivery_category` | Optional for purchase events.<br>Type of delivery for a purchase event. Supported values are:<br>`in_store` — Customer needs to enter the store to get the purchased product.<br>`curbside` — Customer picks up their order by driving to a store and waiting inside their vehicle.<br>`home_delivery` — Purchase is delivered to the customer’s home. |
| `departing_arrival_date` | `fb_departing_arrival_date` | `departing_arrival_date` | The date and time for arrival at the destination of the outbound journey. |
| `departing_departure_date` | `fb_departing_departure_date` | `departing_departure_date` | The date and time for start of the outbound journey. |
| `destination_airport` | `fb_destination_airport` | `destination_airport` | Use official IATA code of destination airport. |
| `destination_ids` | `fb_destination_ids` | `destination_ids` | If you have a destination catalog, you can associate one or more destinations in your destination catalog with a specific hotel event. |
| `dma_code` | `fb_dma_code` | `dma_code` | The Designated Market Area (DMA) code, which the user looks at for offers. |
| `drivetrain` | `fb_drivetrain` | `drivetrain` | Drivetrain of the vehicle: `4X2`, `4X4`, `AWD`, `FWD`, `RWD`, `OTHER`, `NONE`. |
| `exterior_color` | `fb_exterior_color` | `exterior_color` | Exterior color. |
| `fuel_type` | `fb_fuel_type` | `fuel_type` | Fuel type of the vehicle: `DIESEL`, `ELECTRIC`, `FLEX`, `GASOLINE`, `HYBRID`, `PETROL`, `PLUGIN_HYBRID`, `OTHER`, `NONE`. |
| `hotel_score` | `fb_hotel_score` | `hotel_score` | An indicator representing the relative value of this hotel to the advertiser compared to its other hotels. |
| `interior_color` | `fb_interior_color` | `interior_color` | Interior color. |
| `lead_event_source` | `lead_event_source` | `lead_event_source` | Lead event source. |
| `lease_end_date` | `fb_lease_end_date` | `lease_end_date` | Specified using ISO 8601 date format: `YYYY-MM-DD`. |
| `lease_start_date` | `fb_lease_start_date` | `lease_start_date` | Allows us to recommend properties based off their date availability (using `available_dates_price_config` in the catalog), and improve the user landing experience (using template tags). |
| `listing_type` | `fb_listing_type` | `listing_type` | Value must be `for_rent_by_agent`, `for_rent_by_owner`, `for_sale_by_agent`, `for_sale_by_owner`, `foreclosed`, `new_construction` or `new_listing`. |
| `make` | `fb_make` | `make` | Make or brand of the vehicle. |
| `mileage.unit` | `fb_mileage.unit` | `mileage.unit` | Mileage unit. |
| `mileage.value` | `fb_mileage.value` | `mileage.value` | Mileage value. |
| `model` | `fb_model` | `model` | Model of the vehicle. |
| `neighborhood` | `fb_neighborhood` | `neighborhood` | Neighborhood of interest. |
| `net_revenue` | `net_revenue` | `net_revenue` | The margin value of a conversion event. |
| `num_adults` | `fb_num_adults` | `num_adults` | Number of adults that will be staying. |
| `num_children` | `fb_num_children` | `num_children` | Number of children that will be staying. |
| `num_infants` | `fb_num_infants` | `num_infants` | Number of infants that will be staying. |
| `num_items` | `fb_num_items` | `num_items` | Use only with `InitiateCheckout` events.<br>The number of items that a user tries to buy during checkout. |
| `order_id` | `fb_order_id` | `order_id` | The order ID for this transaction as a string. |
| `origin_airport` | `fb_origin_airport` | `origin_airport` | Use official IATA code of departure airport. |
| `postal_code` | `fb_postal_code` | `postal_code` | Postal code. |
| `predicted_ltv` | `predicted_ltv` | `predicted_ltv` | The predicted lifetime value of a conversion event. |
| `preferred_baths_range` | `fb_preferred_baths_range` | `preferred_baths_range` | Number of bathrooms chosen as range. |
| `preferred_beds_range` | `fb_preferred_beds_range` | `preferred_beds_range` | Number of bedrooms chosen as range. |
| `preferred_neighborhoods` | `fb_preferred_neighborhoods` | `preferred_neighborhoods` | Preferred neighborhoods. |
| `preferred_num_stops` | `fb_preferred_num_stops` | `preferred_num_stops` | Indicate the preferred number of stops the user is looking for. |
| `preferred_price_range` | `fb_preferred_price_range` | `preferred_price_range` | Preferred price range for vehicle. Min/max, up to 2 decimals. |
| `preferred_star_ratings` | `fb_preferred_star_ratings` | `preferred_star_ratings` | A tuple of minimum and maximum hotel star rating that a user is filtering for. |
| `price` | `fb_price` | `price` | Cost and currency of the vehicle. Format the price as the cost, followed by the [ISO currency code⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FISO_4217%3Ffbclid%3DIwAR2ULtemU7YsoTB8AJImQX-3SI6WZpHxKb3WXANzqKV00yn6PBbYGdGQmWs&h=AUBYDlnZW9N6Dv7h1E_SI--rWxc2CUQSj3OmfukSS4GYEWVqnI13x7H-rJCMbNuQeepc2Ct4OAtZt7BxeEbNFaSbzF0rj7w_jyju5kx3SNdUbueKbHkdlG0_e_1uAlgo3TUg31BVqCfLQg), with a space between cost and currency. |
| `product_catalog_id` | `product_catalog_id` | `product_catalog_id` | Product catalog id. |
| `property_type` | `fb_property_type` | `property_type` | Must be `apartment`, `condo`, `house`, `land`, `manufactured`, `other` or `townhouse`. |
| `region` | `fb_region` | `region` | State, district, or region of interest. |
| `returning_arrival_date` | `fb_returning_arrival_date` | `returning_arrival_date` | The date and time when the return journey is done. |
| `returning_departure_date` | `fb_returning_departure_date` | `returning_departure_date` | The date and time for start of the return journey. |
| `search_string` | `fb_search_string` | `search_string` | Use only with `Search` events.<br>A search query made by a user. |
| `state_of_vehicle` | `fb_state_of_vehicle` | `state_of_vehicle` | State of vehicle. |
| `suggested_destinations` | `fb_suggested_destinations` | `suggested_destinations` | Suggested destinations. |
| `suggested_home_listings` | `fb_suggested_home_listings` | `suggested_home_listings` | Suggested home listings. |
| `suggested_hotels` | `fb_suggested_hotels` | `suggested_hotels` | Suggested hotels. |
| `suggested_jobs` | `fb_suggested_jobs` | `suggested_jobs` | Suggested jobs. |
| `suggested_local_service_businesses` | `fb_suggested_local_service_businesses` | `suggested_local_service_businesses` | Suggested local service businesses. |
| `suggested_location_based_items` | `fb_suggested_location_based_items` | `suggested_location_based_items` | Suggested location based items. |
| `suggested_vehicles` | `fb_suggested_vehicles` | `suggested_vehicles` | Suggested vehicles. |
| `transmission` | `fb_transmission` | `transmission` | Transmission of the vehicle:: `AUTOMATIC`, `MANUAL`, `OTHER`, `NONE`. |
| `travel_class` | `fb_travel_class` | `travel_class` | Must be `economy`, `premium`, `business` or `first`. |
| `travel_end` | `fb_travel_end` | `travel_end` | Travel end date. |
| `travel_start` | `fb_travel_start` | `travel_start` | Travel start date. |
| `trim` | `fb_trim` | `trim` | Max characters: 50. |
| `user_bucket` | `fb_user_bucket` | `user_bucket` | User bucket. |
| `value` | `_valueToSum` | `value` | Required for purchase events or any events that utilize value optimization.<br>A numeric value associated with the event. This must represent a monetary amount. |
| `vin` | `fb_vin` | `vin` | VIN. |
| `year` | `fb_year` | `year` | Year the vehicle was launched in `yyyy` format. |
|  |  | `item_number` | Unique identifier to distinguish events within the same order or transaction. |
|  | `ad_type` |  | Ad type. |
|  | `fb_content` |  | A list of JSON object that contains the International Article Number (EAN) when applicable, or other product or content identifier(s) as well as quantities and prices of the products. Required: `id`, `quantity`.<br>Example: “\[{"id": "1234", "quantity": 2,}, {"id": "5678", "quantity": 1,}\]”. |
|  | `fb_content_id` |  | International Article Number (EAN) when applicable, or other product or content identifier(s). For multiple product ids: e.g. “\["1234","5678"\]”. |
|  | `fb_description` |  | A string description. |
|  | `fb_level` |  | Level of a game. |
|  | `fb_max_rating_value` |  | Upper bounds of a rating scale, for example 5 on a 5 star scale. |
|  | `fb_payment_info_available` |  | `1` for yes, `0` for no. |
|  | `fb_registration_method` |  | Facebook, Email, Twitter, etc. |
|  | `fb_success` |  | `1` for yes, `0` for no.. |
|  | `_valueToSum` |  | Numeric value of individual event to be summed in reporting. |

Did you find this page helpful?

![Thumbs up icon](https://static.xx.fbcdn.net/rsrc.php/yR/r/OEXJ0_DJeZv.svg)

![Thumbs down icon](https://static.xx.fbcdn.net/rsrc.php/yb/r/qKPgNVNeatU.svg)

* * *