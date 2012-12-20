Chart
=====

HTML canvas-based pie and ring charts with tooltips and update animations.

Demos
-----

[Pie Chart Demo](http://www.matts411.com/static/demos/chart/pie_chart.html)  
[Ring Chart Demo](http://www.matts411.com/static/demos/chart/ring_chart.html)

Features
--------

* Cross browser compatible (Chrome, Firefox, Safari, Opera, Internet Explorer 7+)
* Framework independent - Works with jQuery, Mootools, etc.
* Pie charts with animations and tooltips
* 2-level Ring charts with animations and tooltips

Installation
------------

Minify and add `src/Chart.js` and `src/Chart.css` to your website's resources 
directory. You can change some of the styling in Chart.css to suit your needs.

If you plan on supporting Internet Explorer 8 or older, you'll need to also 
minify and add `src/excanvas2.js` as well as the image file `src/clear.gif`.

ExCanvas2 can be used as a drop-in replacement for ExCanvas if you are already 
using it. Search for the string `"outputToBuffer"` in `src/excanvas2.js` for 
comments on potential performance gains versus `src/excanvas.js`.

Usage
-----

Create a `div` element with an `id` attribute, relative positioning and a fixed 
width and height:

    <div id="myChart" style="position:relative;width:250px;height:250px;"></div>

Initialize the chart using Javascript:

    new Chart.Pie("myChart", {
      showTooltips : true, 
      chartMinSize : [250, 250], 
      chartMaxSize : [250, 250], 
      chartData : [["Firefox", 39.20, "00:01:33", "#759ddf"], 
                   ["Internet Explorer", 30.58, "00:03:04", "#76df72"], 
                   ["Chrome", 22.91, "00:02:01", "#f1d94b"], 
                   ["Safari", 3.63, "00:01:03", "#f1994a"], 
                   ["Opera", 2.28, "00:00:48", "#f15f5f"], 
                   ["Other", 1.40, "00:00:14", "#aa7be5"]]
    });

A ring chart is initialized similarly:

    new Chart.Ring("myChart", {
      showTooltips : true, 
      chartMinSize : [250, 250], 
      chartMaxSize : [250, 250], 
      chartData : [["Fixed Income", [
                       ["Taxable Bonds", 10.00, ""], 
                       ["High Yield Bonds", 10.00, ""], 
                       ["Int'l Debt", 10.00, ""]], "", "#76df72"], 
                   ["Equity", [
                       ["Large Cap Equity", 15.00, ""], 
                       ["Mid Cap Equity", 10.00, ""], 
                       ["Small Cap Equity", 5.00, ""], 
                       ["Int'l Equity", 10.00, ""]], "", "#759ddf"], 
                   ["Real Estate", [
                       ["Global Public REITs", 5.00, ""], 
                       ["Private Real Estate", 10.00, ""]], "", "#f1d94b"], 
                   ["Alternatives", [
                       ["Diversified Hedge", 5.00, ""], 
                       ["Private Equity", 5.00, ""]], "", "#f1994a"], 
                   ["Cash", [
                       ["Cash", 5.00, ""]], "", "#f15f5f"]]
    });

See the demo source code for an animation example.

Options
-------

**showTooltips**  
Boolean. Show tooltips when a mouse hovers over a slice. Disabled automatically in touch devices.  
Default is `false`.

**selectorPrefix**  
String. Prefixed to every `id`, `name`, `class` attribute for DOM element reference.  
Default is `"chart"`.

**selectorSuffix**  
String. Suffixed to every `id` and `name` attribute for DOM element reference (note NOT `class`.)  
Default is `""`.

**chartData**  
Array. An array of arrays. Inner array format depends on the chart type. See usage section for examples.  
Default is `[]`.

**chartMinSize**  
Array. Format is `[width, height]` in pixels (`-Infinity` for no minimum.)  
Default is `[-Infinity, -Infinity]`.

**chartMaxSize**  
Array. Format is `[width, height]` in pixels (`Infinity` for no maximum.)  
Default is `[Infinity, Infinity]`.

**clearImgPath**  
String. Path location of a 1x1 pixel transparent image for use by Internet Explorer 7 and older.  
Default is `"src/clear.gif"`.

**onRegionEnter**  
Function. If `showTooltips` is `true`, this function will be called whenever a mouse enters into a tooltip
region, such as a pie chart slice. Returned in `arguments` are one or more string labels passed in from the 
`chartData` option. The number of `arguments` differs by chart type.  
Default is a function that does nothing.

**onRegionExit**  
Function. Same as `onRegionEnter` but in reverse.  
Default is a function that does nothing.

Future Features
---------------

* Bar charts
* Line charts

License
-------

MIT-style license.  
Copyright 2012 Matt V. Murphy | bW11cnBoMjExQGdtYWlsLmNvbQ==
