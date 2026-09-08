<!-- Source: https://developers.facebook.com — official Meta documentation. Fetched 2026-09-08 with Firecrawl. Content below is unaltered. -->

Meta Pixel

# Meta Pixel Implementation for Single Page Applications

Updated: Jan 27, 2022

Copy for LLM

[View as Markdown](https://developers.facebook.com/documentation/meta-pixel/implementation/tag_spa.md)

Single Page Applications (SPA) does not require a page to be reloaded when the URL changes therefore a different approach to event tracking with the Meta Pixel has to be followed.

### Requirements

The Pixel’s [base code](https://developers.facebook.com/documentation/meta-pixel/get-started) must already be installed on the webpage where you will be tracking events.

**Note:** You can set `disablePushState` to `true` to stop sending `PageView` events on history state changes but it is not recommended.

## Track a an Action

Track a specific area where an action it taking place using the History State API. There is no one one-size fits all solution to this as it highly depends on the framework and the implementation details. The general idea is to track the event whenever there is a URL change in the SPA. Hooking it into the routing system of the framework or application is required.

#### Example Code

```
...
<body>
  <ul id="menu" class="clearfix">
    <li><a href="link1">Link 1</a></li>  //Link to ViewContent
    <li><a href="link2">Link 2</a></li>  //Link to AddPaymentInfo
    <li><a href="link3">Link 3</a></li>  //Link to CompleteRegistration
  </ul>
...
  <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.6.0/jquery.min.js"></script>
  <script>
    (function($) {
      var loadContent = function(href) {     // Simulates an AJAX call to the server to grab new content
        $.ajax(href + ".html", {
          success: function(data) {
            history.pushState({ 'url': href }, 'New URL: ' + href, href);     // Called to the the URL on link click
            $('#content').html(data + new Date());

            var eventname = null;   //Optional Section - Demonstrates that additional
            switch (href) {         // events can be tracked on particular path changes
              case 'link1':
                eventname = 'ViewContent';
                break;
              case 'link2':
                eventname = 'AddPaymentInfo';
                break;
              case 'link3':
                eventname = 'CompleteRegistration';
                break;
              default:
            }

            fbq('track', eventname)   //Tracking event function is called
          },
          error: function() {
            console.log('An error occurred');
          }
        });
      };

      var init = function() {
        $('#menu a').click(function(e) {
          e.preventDefault();
          loadContent($(this).attr("href"));
        });
      };

      $(document).ready(function() {
        init();
      });
    })(jQuery);
  </script>
</body>
...
```

## Learn More

Visit [Google’s Tag Manager documentation⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fmarketingplatform.google.com%2Fabout%2Ftag-manager%2F&h=AUAdgUkgbOdZYBiOs3eFovE8XO1wkoXdZEC3pibkHSUmtZhO8MTkPnI8-dIpu4V1cK0zKA_cVM6TkoSqXJwNbsE-R-8ux6Zaqn0zITjVRxjvL6nckgVqYJlEOagoWQ7_Qb44YKQra6Q82Q) to track events using a tag manager
Debug using [DataLayer plugins⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fdatalayer-checker%2Fffljdddodmkedhkcjhpmdajhjdbkogke&h=AUAdgUkgbOdZYBiOs3eFovE8XO1wkoXdZEC3pibkHSUmtZhO8MTkPnI8-dIpu4V1cK0zKA_cVM6TkoSqXJwNbsE-R-8ux6Zaqn0zITjVRxjvL6nckgVqYJlEOagoWQ7_Qb44YKQra6Q82Q) or the [Meta Ads Data Advisor⁠](https://l.facebook.com/l.php?u=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Ffacebook-pixel-helper%2Ffdgfkebogiimcoedlicjlajpkdmockpc&h=AUAdgUkgbOdZYBiOs3eFovE8XO1wkoXdZEC3pibkHSUmtZhO8MTkPnI8-dIpu4V1cK0zKA_cVM6TkoSqXJwNbsE-R-8ux6Zaqn0zITjVRxjvL6nckgVqYJlEOagoWQ7_Qb44YKQra6Q82Q) to see event tracking

* * *