////////////////////////////////////
//
// Chart
//
// MIT-style license. Copyright 2010 Matt V. Murphy
// Credits to Greg Houston (http://demos.greghoustondesign.com/piechart/)
//
////////////////////////////////////
var Chart = new Class({
	Implements : [Options], 
	Binds : ["showToolTip", "hideToolTip"], 
	
	options : {
		showTooltips : true, 
		selectorPrefix : "chart", // Prefixed to every id, name, class attribute for DOM element reference
		selectorSuffix : "", // Suffixed to every id and name attribute for DOM element reference (note NOT class)
		chartType : "", 
		chartData : [], // An array of arrays. Inner array format depends on the chart type
		chartMinSize : [-Infinity, -Infinity], // [width, height] (-Infinity for no minimum)
		chartMaxSize : [Infinity, Infinity] // [width, height] (Infinity for no maximum)
	}, 
	
	clearPng : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12P4zwAAAgEBAKrChTYAAAAASUVORK5CYII=", 
	
	//////////////////////////////////////////////////////////////////////////////////
	initialize : function(element, options) {
		this.element = document.id(element);
		this.setOptions(options);
		this.options.selectorSuffix = (this.options.selectorSuffix !== "") ? this.options.selectorSuffix : new Date().getTime();
		
		// Right now only pie chart is supported:
		if (this.options.chartType === "pieChart") {
			this.renderPieChart();
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	renderPieChart : function() {
		var browserUsesExCanvas = (Browser.ie6 || Browser.ie7 || Browser.ie8), 
		    showTooltips = this.options.showTooltips, 
		    prefix = this.options.selectorPrefix, 
		    suffix = this.options.selectorSuffix, 
		    pieDiv = this.element.set("html", ""), 
		    pieDivSize, 
		    pie = document.createElement("canvas"), 
		    pieData = this.options.chartData, 
		    pieSize, 
		    pieMinSize = this.options.chartMinSize, 
		    pieMaxSize = this.options.chartMaxSize, 
		    pieCenter, 
		    pieRadius, 
		    ctx, 
		    ctxColor, 
		    ctxGradient, 
		    totalAbsolutePercent = 0, // Usually 100
		    lastRadian = -1 * (Math.PI / 2.0), 
		    mapVertices = 36, 
		    mapHtml = [], 
		    mapHtmlI = 0;
		
		pieDivSize = pieDiv.getSize();
		pieSize = Math.max(Math.min(pieDivSize.x, pieDivSize.y, pieMaxSize[0], pieMaxSize[1]), pieMinSize[0], pieMinSize[1]);
		pieCenter = Math.floor(pieSize / 2.0);
		pieRadius = Math.floor((pieSize - 20) / 2.0);
		for (var i=pieData.length-1, slice; slice=pieData[i]; i--) {
			totalAbsolutePercent += Math.abs(slice[1]);
		}
		
		pie.id = prefix + "Chart" + suffix;
		if (browserUsesExCanvas) {
			pie.style.width = pieSize + "px";
			pie.style.height = pieSize + "px";
		} else {
			pie.setAttribute("width", pieSize);
			pie.setAttribute("height", pieSize);
		}
		pieDiv.appendChild(pie);
		
		if (browserUsesExCanvas) {
			G_vmlCanvasManager.initElement(pie);
		}
		
		ctx = pie.getContext("2d");
		ctx.globalCompositeOperation = "source-over";
		
		// Draw base circle:
		ctx.beginPath();
		ctx.moveTo(pieCenter + 2, pieCenter + 2);
		ctx.arc(pieCenter + 2, pieCenter + 2, pieRadius + 1, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fillStyle = "#cccccc";
		ctx.fill();
		
		ctx.beginPath();
		ctx.moveTo(pieCenter, pieCenter);
		ctx.arc(pieCenter, pieCenter, pieRadius, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fillStyle = "#ffffff";
		ctx.fill();
		
		// Draw pie slices:
		for (var i=pieData.length-1, slice; slice=pieData[i]; i--) {
			slice[4] = ((Math.abs(slice[1]) / totalAbsolutePercent) * 2 * Math.PI);
			slice[4] = (browserUsesExCanvas && slice[4] === (2 * Math.PI)) ? 0.99999 * slice[4] : slice[4]; // IE < 9 does not render a 100% arc slice
			slice[5] = []; // For polygon
			slice[6] = 0; // slice[4] incrementer
			slice[7] = (lastRadian + slice[4]) - lastRadian; // Arc distance in radians
			slice[8] = Math.max(Math.round((slice[7] / (2 * Math.PI)) * mapVertices) - 2, 0); // Number of vertices to use from total for this slice
			slice[9] = slice[7] / Math.max(slice[8], 1); // Vertices increment in radians
			slice[10] = 0; // Used later for tracking
			
			// Gradient for colored slice:
			ctxGradient = ctx.createRadialGradient(pieCenter, pieCenter, 0, pieCenter, pieCenter, pieRadius);
			if (browserUsesExCanvas) {
				ctxGradient.addColorStop(0.0, "#ffffff");
				ctxGradient.addColorStop(0.1, (slice[1] < 0) ? "#eeeeee" : slice[3]);
			} else if (slice[1] < 0) { // Negative percent if slice[1] < 0
				ctxGradient.addColorStop(0.0, "#fafafa");
				ctxGradient.addColorStop(1.0, "#eeeeee");
			} else {
				ctxColor = slice[3].hexToRgb(true).rgbToHsb();
				ctxColor = [ctxColor[0] - 15, ctxColor[1] - 15, ctxColor[2] + 20];
				ctxColor[0] = (ctxColor[0] >= 0) ? ctxColor[0] : 360 + ctxColor[0];
				ctxGradient.addColorStop(0.0, "rgb(" + ctxColor.hsbToRgb(true).join(", ") + ")");
				ctxGradient.addColorStop(1.0, slice[3]);
			}
			
			// Draw slice:
			ctx.beginPath();
			ctx.moveTo(pieCenter, pieCenter);
			ctx.arc(pieCenter, pieCenter, pieRadius, lastRadian, lastRadian + slice[4], false);
			ctx.lineTo(pieCenter, pieCenter);
			ctx.closePath();
			ctx.fillStyle = ctxGradient;
			ctx.fill();
			
			// Draw a non-IE < 9 second overlay slice for visual effect:
			if (!browserUsesExCanvas && slice[1] >= 0) {
				ctxColor = slice[3].hexToRgb(true);
				ctxGradient = ctx.createRadialGradient(pieCenter, pieCenter, 0, pieCenter, pieCenter, pieRadius);
				ctxGradient.addColorStop(0.0, "rgba(" + ctxColor.join(", ") + ", 0.0)");
				ctxGradient.addColorStop(1.0, "rgba(255, 255, 255, 0.05)");
				
				ctx.beginPath();
				ctx.moveTo(pieCenter, pieCenter);
				ctx.arc(pieCenter, pieCenter, pieRadius, lastRadian, lastRadian + slice[4], false);
				ctx.lineTo(pieCenter, pieCenter);
				ctx.closePath();
				ctx.fillStyle = ctxGradient;
				ctx.fill();
			}
			
			// Draw slice outline:
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(pieCenter, pieCenter);
			ctx.arc(pieCenter, pieCenter, pieRadius, lastRadian, lastRadian + slice[4], false);
			ctx.lineTo(pieCenter, pieCenter);
			ctx.closePath();
			ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
			ctx.stroke();
			
			// Calculate area element polygon coordinates (polygon modeled after slice shape):
			if (showTooltips) {
				slice[5][slice[6]++] = pieCenter;
				slice[5][slice[6]++] = pieCenter;
				slice[5][slice[6]++] = pieCenter + Math.round(Math.cos(lastRadian) * pieRadius);
				slice[5][slice[6]++] = pieCenter + Math.round(Math.sin(lastRadian) * pieRadius);
				for (var j=0; j<slice[8]; j++) {
					slice[10] = lastRadian + (slice[9] * (j + 1));
					slice[5][slice[6]++] = pieCenter + Math.round(Math.cos(slice[10]) * pieRadius);
					slice[5][slice[6]++] = pieCenter + Math.round(Math.sin(slice[10]) * pieRadius);
				}
				slice[5][slice[6]++] = pieCenter + Math.round(Math.cos(lastRadian + slice[4]) * pieRadius);
				slice[5][slice[6]++] = pieCenter + Math.round(Math.sin(lastRadian + slice[4]) * pieRadius);
				slice[5][slice[6]++] = pieCenter;
				slice[5][slice[6]++] = pieCenter;
				mapHtml[mapHtmlI++] = "<AREA index='" + i + "' shape='poly' coords='" + slice[5].join(",") + "'>";
			}
			
			lastRadian += slice[4];
		}
		
		if (showTooltips) {
			// Generate MAP element:
			new Element("MAP", {
				"id" : prefix + "Map" + suffix, 
				"name" : prefix + "Map" + suffix, 
				"class" : prefix + "Map", 
				"html" : mapHtml.join(""), 
				"events" : { "mouseleave" : this.hideToolTip }
			}).inject(pieDiv);
			
			// Generate IMAGE element:
			new Element("IMG", {
				"id" : prefix + "Image" + suffix, 
				"usemap" : "#" + prefix + "Map" + suffix, 
				"class" : prefix + "Image", 
				"src" : (!Browser.ie6 && !Browser.ie7) ? this.clearPng : "stylesheets/clear.gif", 
				"styles" : { "width" : pieDivSize.x, "height" : pieDivSize.y }
			}).inject(pieDiv);
			
			// Generate DIV (tooltip) element:
			this.toolTipThrottle = -1;
			this.toolTip = (!!this.toolTip) ? this.toolTip : new Element("DIV", {
				"id" : prefix + "Tooltip" + suffix, 
				"class" : prefix + "Tooltip"
			}).inject(document.body);
			
			// Add mousemove events:
			pieDiv.getElements("AREA").addEvent("mousemove", this.showToolTip);
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	showToolTip : function(event) {
		this.toolTipThrottle++;
		if (this.toolTipThrottle & 1) { // Bitwise for every other time
			return;
		}
		
		var index = event.target.getAttribute("index"), 
		    top = event.page.y + 15, 
		    left = event.page.x + 15, 
		    sector;
		
		if (this.lastIndex !== index) {
			this.lastIndex = index;
			sector = this.options.chartData[index.toInt()];
			this.toolTip.set("html", "<strong>" + sector[0] + "</strong><br>" + sector[1].toFixed(2) + "%<br>" + sector[2]);
		}
		if (this.lastTop !== top || this.lastLeft !== left) {
			this.lastTop = top;
			this.lastLeft = left;
			this.toolTip.setStyle("cssText", "top:" + top + "px;left:" + left + "px;");
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	hideToolTip : function(event) {
		this.toolTipThrottle = -1;
		this.lastIndex = undefined;
		if (!!this.toolTip) {
			this.toolTip.set({ "html" : "", "styles" : { "cssText" : "" } });
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	cleanUp : function() {
		if (!!this.toolTip) {
			this.toolTip.dispose();
			this.toolTip = null;
		}
		return null;
	}
});

