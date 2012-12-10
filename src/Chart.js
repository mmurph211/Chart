////////////////////////////////////
//
// Chart
// MIT-style license. Copyright 2012 Matt V. Murphy
//
////////////////////////////////////
(function(window, document, undefined) {
	"use strict";
	
	var Chart = function(element, options) {
		if ((this.element = (typeof(element) === "string") ? $(element) : element)) {
			this.element.innerHTML = "";
			this.animateTimer = null;
			this.cache = {};
			this.toolTip = null;
			this.toolTips = {};
			this.toolTipThrottle = -1;
			this.setOptions(options);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.nothing = function(){};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.setOptions = function(options) {
		var hasOwnProp = Object.prototype.hasOwnProperty, 
		    option;
		
		this.options = {
			showTooltips : true, 
			selectorPrefix : "chart", 
			selectorSuffix : "", 
			chartData : [], 
			chartMinSize : [-Infinity, -Infinity], 
			chartMaxSize : [Infinity, Infinity], 
			clearImgPath : "src/clear.gif", 
			onRegionEnter : this.nothing, 
			onRegionExit : this.nothing
		};
		
		if (options) {
			for (option in this.options) {
				if (hasOwnProp.call(this.options, option) && options[option] !== undefined) {
					this.options[option] = options[option];
				}
			}
		}
		this.options.selectorSuffix = this.options.selectorSuffix || ("" + Math.ceil(Math.random() * 50000));
		this.options.showTooltips = (this.options.showTooltips && window.ontouchstart === undefined);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.getCanvas = function(chartSize) {
		var chartId = this.options.selectorPrefix + "Chart" + this.options.selectorSuffix, 
		    chart = $(chartId);
		
		if (!chart) {
			chart = document.createElement("canvas");
			chart.id = chartId;
			if (usingExCanvas) {
				chart.style.width = chartSize + "px";
				chart.style.height = chartSize + "px";
			} else {
				chart.setAttribute("width", chartSize);
				chart.setAttribute("height", chartSize);
			}
			this.element.appendChild(chart);
			
			if (usingExCanvas) {
				G_vmlCanvasManager.initElement(chart);
			}
		}
		return chart;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.drawCircularBase = function(ctx, dim) {
		var fillStyles = ["#ffffff", "#eeeeee", "#dddddd"];
		
		// Draw base circles:
		for (var i=2; i>=0; i--) {
			ctx.beginPath();
			ctx.moveTo(dim.center + i, dim.center + i);
			ctx.arc(dim.center + i, dim.center + i, dim.radius + Math.floor(i / 2.0), 0, twoPI, false);
			ctx.closePath();
			ctx.fillStyle = fillStyles[i];
			ctx.fill();
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.getSliceArc = function(part, absTotal) {
		var arc = (Math.abs(part || 0) / absTotal) * twoPI;
		return (usingExCanvas && arc === twoPI) ? 0.99999 * arc : arc; // Excanvas does not render a 100% arc slice
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.traceSliceArc = function(ctx, dim, dimProp, arcFrom, arcTo) {
		ctx.beginPath();
		ctx.moveTo(dim.center, dim.center);
		ctx.arc(dim.center, dim.center, dim[dimProp] || dim.radius, arcFrom, arcFrom + arcTo, false);
		ctx.lineTo(dim.center, dim.center);
		ctx.closePath();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.getSliceGradient = function(ctx, dim, dimProp, part, baseColor) {
		var cacheKey = (dimProp || "radius") + ((part < 0) ? "-0-" : "-1-") + baseColor, 
		    gradient = this.cache[cacheKey], 
		    color;
		
		if (!gradient) {
			gradient = ctx.createRadialGradient(dim.center, dim.center, 0, dim.center, dim.center, dim[dimProp] || dim.radius);
			
			if (part < 0) {
				gradient.addColorStop(0.0, "#fafafa");
				gradient.addColorStop(1.0, "#eeeeee");
			} else {
				color = rgbToHsb(hexToRgb(baseColor));
				color = [color[0], Math.max(color[1] - 15, 0), Math.min(color[2] + 20, 100)];
				gradient.addColorStop(0.0, "rgb(" + hsbToRgb(color).join(", ") + ")");
				gradient.addColorStop(1.0, baseColor);
			}
			
			this.cache[cacheKey] = gradient;
		}
		
		return gradient;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.getSliceOverlayGradient = function(ctx, dim, dimProp) {
		var cacheKey = dimProp || "radius", 
		    gradient = this.cache[cacheKey];
		
		if (!gradient) {
			gradient = ctx.createRadialGradient(dim.center, dim.center, 0, dim.center, dim.center, dim[dimProp] || dim.radius);
			
			if (usingExCanvas) {
				gradient.addColorStop(0.0, "rgba(255, 255, 255, 0.0)");
				gradient.addColorStop(1.0, "rgba(255, 255, 255, " + ((this.chartType === "pieChart") ? "0.3" : "0.05") +")");
			} else {
				gradient.addColorStop(0.0, "rgba(0, 0, 0, 0.0)");
				gradient.addColorStop((this.chartType === "pieChart") ? 0.8 : 0.9, "rgba(0, 0, 0, 0.0)");
				gradient.addColorStop(1.0, "rgba(0, 0, 0, 0.05)");
			}
			this.cache[cacheKey] = gradient;
		}
		return gradient;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.getPctForDisplay = function(part, absTotal) {
		var cacheKey = "pct-" + part + "-" + absTotal, 
		    pct = this.cache[cacheKey];
		
		if (!pct) {
			this.cache[cacheKey] = pct = ((Math.abs(part || 0) / absTotal) * 100).toFixed(2);
		}
		return pct;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.generateToolTipElements = function(dim, mapHtml) {
		var prefix = this.options.selectorPrefix, 
		    suffix = this.options.selectorSuffix, 
		    showToolTipBound = bind(this.showToolTip, this), 
		    hideToolTipBound = bind(this.hideToolTip, this);
		
		// Credits to Greg Houston (http://greghoustondesign.com) for MAP solution
		var eMap = document.createElement("MAP");
		eMap.id = prefix + "Map" + suffix;
		eMap.name = prefix + "Map" + suffix;
		eMap.className = prefix + "Map" + suffix;
		eMap.innerHTML = mapHtml;
		eMap.onmouseout = hideToolTipBound;
		this.element.appendChild(eMap);
		
		var eImg = document.createElement("IMG");
		eImg.id = prefix + "Image" + suffix;
		eImg.useMap = "#" + prefix + "Map" + suffix;
		eImg.className = prefix + "Image";
		eImg.src = (ieVersion < 8) ? this.options.clearImgPath : clearImg;
		eImg.style.cssText = "width:" + dim.elementSize.x + "px;height:" + dim.elementSize.y + "px;";
		this.element.appendChild(eImg);
		
		this.toolTip = this.toolTip || (function() {
			var eDiv = document.createElement("DIV");
			eDiv.id = prefix + "Tooltip" + suffix;
			eDiv.className = prefix + "Tooltip";
			document.body.appendChild(eDiv);
			return eDiv;
		})();
		
		var eAreas = this.element.getElementsByTagName("AREA");
		for (var i=0, eArea; eArea=eAreas[i]; i++) {
			eArea.onmousemove = showToolTipBound;
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.showToolTip = function(event) {
		var event, index, page, top, left;
		
		if ((this.toolTipThrottle++) & 1) {
			event = event || window.event;
			index = (event.target || event.srcElement).getAttribute("index");
			page = getEventPagePositions(event);
			left = page.x + 15;
			top = page.y + 15;
			
			if (this.lastIndex !== index) {
				this.lastIndex = index;
				this.toolTip.innerHTML = this.toolTips[index] || "";
				this.options.onRegionEnter.apply(this, this.getRegionLabelByTooltipIndex(index));
			}
			if (this.lastTop !== top || this.lastLeft !== left) {
				this.lastTop = top;
				this.lastLeft = left;
				this.toolTip.style.cssText = "top:" + top + "px;left:" + left + "px;";
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.hideToolTip = function(event) {
		this.toolTipThrottle = -1;
		this.options.onRegionExit.apply(this, this.getRegionLabelByTooltipIndex(this.lastIndex));
		this.lastIndex = undefined;
		if (!!this.toolTip) {
			this.toolTip.innerHTML = "";
			this.toolTip.style.cssText = "";
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.prototype.cleanUp = function(isFromAnimate) {
		if (isFromAnimate !== true) {
			this.animateTimer = (this.animateTimer) ? window.clearTimeout(this.animateTimer) : null;
			this.element.innerHTML = "";
		}
		try { this.toolTip.parentNode.removeChild(this.toolTip); } catch (e) {}
		return null;
	};
	
	//////////////////////////////////
	//
	// Chart.Pie
	//
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie = function(element, options) {
		this.chartType = "pieChart";
		Chart.apply(this, [element, options]);
		this.generate(false);
	};
	Chart.Pie.prototype = new Chart();
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.generate = function(doMinimal) {
		var absTotal = this.getAbsoluteTotal(), 
		    dim = this.getDimensions(doMinimal), 
		    chart = this.getCanvas(dim.chartSize), 
		    ctx = chart.getContext("2d");
		
		if (!doMinimal) {
			ctx.globalCompositeOperation = "source-over";
			ctx.lineWidth = 1.0;
			this.drawCircularBase(ctx, dim);
		}
		this.drawSlices(ctx, dim, absTotal);
		if (!doMinimal && this.options.showTooltips) {
			this.generateToolTips(dim, absTotal, 36);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.getAbsoluteTotal = function() {
		var slices = this.options.chartData, 
		    absTotal = 0;
		
		for (var i=0, slice; slice=slices[i]; i++) {
			absTotal += Math.abs(slice[1] || 0);
		}
		
		return absTotal;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.getDimensions = function(useCache) {
		var dim = (useCache) ? this.cache[dimCacheKey] : null;
		
		if (!dim) {
			dim = { elementSize : { x : this.element.offsetWidth, y : this.element.offsetHeight } };
			dim.chartSize = Math.max(this.options.chartMinSize[0], 
			                         this.options.chartMinSize[1], 
			                         Math.min(dim.elementSize.x, 
			                                  dim.elementSize.y, 
			                                  this.options.chartMaxSize[0], 
			                                  this.options.chartMaxSize[1]));
			
			dim.center = Math.floor(dim.chartSize / 2.0);
			dim.radius = Math.floor((dim.chartSize - 20) / 2.0);
			this.cache[dimCacheKey] = dim;
		}
		
		return dim;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.drawSlices = function(ctx, dim, absTotal) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    dimProp = "radius", 
		    oGradient = this.getSliceOverlayGradient(ctx, dim, dimProp), 
		    slice, arcFrom, arcTo;
		
		arcFrom = Math.PI / -2.0;
		while ((slice = slices[--i])) {
			if (!(arcTo = this.getSliceArc(slice[1], absTotal))) {
				continue;
			}
			
			// Draw slice:
			this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
			ctx.fillStyle = this.getSliceGradient(ctx, dim, dimProp, slice[1], slice[3]);
			ctx.fill();
			
			// Draw a second overlay slice for visual effect:
			this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
			ctx.fillStyle = oGradient;
			ctx.fill();
			
			// Draw slice outline:
			this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
			ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
			ctx.stroke();
			
			arcFrom += arcTo;
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.generateToolTips = function(dim, absTotal, vertices) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    mHtml = [], m = 0, 
		    slice, arcFrom, arcTo;
		
		arcFrom = Math.PI / -2.0;
		while ((slice = slices[--i])) {
			if (!(arcTo = this.getSliceArc(slice[1], absTotal))) {
				continue;
			}
			
			mHtml[m++] = this.generateMapElementArea(i, dim, "radius", arcFrom, arcTo, vertices);
			this.toolTips["" + i] = "<strong>" + slice[0] + "</strong><br>" + 
			                        ((slice[2]) ? slice[2] + "<br>" : "") + 
			                        this.getPctForDisplay(slice[1], absTotal) + "%";
			arcFrom += arcTo;
		}
		
		this.generateToolTipElements(dim, mHtml.join(""));
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.generateMapElementArea = function(idx, dim, dimProp, arcFrom, arcTo, vertices) {
		var round = Math.round, cos = Math.cos, sin = Math.sin, 
		    arcVertices = Math.max(round((arcTo / twoPI) * vertices) - 2, 0), 
		    arcIncr = arcTo / Math.max(arcVertices, 1), 
		    coords = [], c = 0;
		
		dimProp = (dimProp && dim[dimProp] !== undefined) ? dimProp : "radius";
		
		// Calculate area element polygon coordinates (polygon modeled after slice shape):
		coords[c++] = dim.center;
		coords[c++] = dim.center;
		coords[c++] = dim.center + round(cos(arcFrom) * dim[dimProp]);
		coords[c++] = dim.center + round(sin(arcFrom) * dim[dimProp]);
		for (var v=1; v<=arcVertices; v++) {
			coords[c++] = dim.center + round(cos(arcFrom + (arcIncr * v)) * dim[dimProp]);
			coords[c++] = dim.center + round(sin(arcFrom + (arcIncr * v)) * dim[dimProp]);
		}
		coords[c++] = dim.center + round(cos(arcFrom + arcTo) * dim[dimProp]);
		coords[c++] = dim.center + round(sin(arcFrom + arcTo) * dim[dimProp]);
		coords[c++] = dim.center;
		coords[c++] = dim.center;
		return ["<AREA index='", idx, "' shape='poly' coords='", coords.join(","), "'>"].join("");
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.getRegionLabelByTooltipIndex = function(tooltipIdx) {
		var tooltipIdx = parseInt("" + tooltipIdx, 10), 
		    slice = (!isNaN(tooltipIdx)) ? this.options.chartData[tooltipIdx] || [] : [];
		
		return [(slice.length) ? slice[0] || "" : ""];
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.updateData = function(newData) {
		var slices = this.options.chartData, 
		    animate = (!usingExCanvas), 
		    animateData = [], 
		    incBy;
		
		// Stop any current animations:
		this.animateTimer = (this.animateTimer) ? window.clearTimeout(this.animateTimer) : null;
		
		// Check if animatable:
		if (animate && slices.length === (newData || []).length) {
			for (var i=0, slice, newSlice; (slice=slices[i]) && (newSlice=newData[i]); i++) {
				if (slice[0] === newSlice[0] && slice[1] > 0 && newSlice[1] > 0 && slice[3] === newSlice[3]) {
					incBy = (slice[1] - newSlice[1]) / animateLoops;
					animateData[i] = { "slice" : slice, "tempSlice" : slice.concat(), "newSlice" : newSlice, "incBy" : incBy };
				} else {
					animate = false;
					break;
				}
			}
		} else {
			animate = false;
		}
		
		// Animate or simply reinitialize:
		if (animate) {
			this.animate(1, animateData);
		} else {
			this.options.chartData = newData;
			this.cleanUp(true);
			Chart.Pie.apply(this, [this.element, this.options]);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Pie.prototype.animate = function(counter, animateData) {
		var chartData = [];
		
		// Regenerate chart with temp data:
		if (counter < animateLoops) {
			for (var i=0, item; item=animateData[i]; i++) {
				if (item["incBy"] < 0) {
					item["tempSlice"][1] = item["slice"][1] + (counter * Math.abs(item["incBy"]));
				} else {
					item["tempSlice"][1] = item["slice"][1] - (counter * item["incBy"]);
				}
				chartData[i] = item["tempSlice"];
			}
			this.options.chartData = chartData;
			this.generate(true);
			
			counter++;
			this.animateTimer = window.setTimeout(bind(this.animate, this, [counter, animateData]), animateInt);
			
		// Finalize with new data:
		} else {
			for (var i=0, item; item=animateData[i]; i++) {
				chartData[i] = item["newSlice"];
			}
			this.options.chartData = chartData;
			this.cleanUp(true);
			Chart.Pie.apply(this, [this.element, this.options]);
		}
	};
	
	//////////////////////////////////
	//
	// Chart.Ring
	//
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring = function(element, options) {
		this.chartType = "ringChart";
		Chart.apply(this, [element, options]);
		this.generate(false);
	};
	Chart.Ring.prototype = new Chart();
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.generate = function(doMinimal) {
		var absTotal = this.getAbsoluteTotal(), 
		    dim = this.getDimensions(doMinimal), 
		    chart = this.getCanvas(dim.chartSize), 
		    ctx = chart.getContext("2d");
		
		if (!doMinimal) {
			ctx.globalCompositeOperation = "source-over";
			ctx.lineWidth = 1.0;
			this.drawCircularBase(ctx, dim);
		}
		this.drawOuterSlices(ctx, dim, absTotal);
		this.drawInnerSlices(ctx, dim, absTotal);
		this.drawCenter(ctx, dim);
		if (!doMinimal && this.options.showTooltips) {
			this.generateToolTips(dim, absTotal, 36);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.getAbsoluteTotal = function() {
		var slices = this.options.chartData, 
		    absTotal = 0, 
		    subSlices;
		
		for (var i=0, slice; slice=slices[i]; i++) {
			subSlices = slice[1] || [];
			for (var j=0, subSlice; subSlice=subSlices[j]; j++) {
				absTotal += Math.abs(subSlice[1] || 0);
			}
		}
		
		return absTotal;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.getDimensions = function(useCache) {
		var dim = (useCache) ? this.cache[dimCacheKey] : null;
		
		if (!dim) {
			dim = { elementSize : { x : this.element.offsetWidth, y : this.element.offsetHeight } };
			dim.chartSize = Math.max(this.options.chartMinSize[0], 
			                         this.options.chartMinSize[1], 
			                         Math.min(dim.elementSize.x, 
			                                  dim.elementSize.y, 
			                                  this.options.chartMaxSize[0], 
			                                  this.options.chartMaxSize[1]));
			
			dim.center = Math.floor(dim.chartSize / 2.0);
			dim.radius = Math.floor((dim.chartSize - 20) / 2.0);
			dim.ratios = { outerRing : 0.25, innerRing : 0.35, white : 0.40 };
			dim.innerRadius = Math.round(dim.radius * (dim.ratios.innerRing + dim.ratios.white));
			dim.whiteRadius = Math.round(dim.radius * dim.ratios.white);
			this.cache[dimCacheKey] = dim;
		}
		
		return dim;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.drawOuterSlices = function(ctx, dim, absTotal) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    dimProp = "radius", 
		    oGradient = this.getSliceOverlayGradient(ctx, dim, dimProp), 
		    slice, sliceBaseColor, 
		    subSlices, j, subSlice, subSliceColor, 
		    arcFrom, arcTo;
		
		arcFrom = Math.PI / -2.0;
		while ((slice = slices[--i])) {
			subSlices = slice[1];
			j = (subSlices || []).length;
			sliceBaseColor = rgbToHsb(hexToRgb(slice[3]));
			
			while ((subSlice = subSlices[--j])) {
				if (!(arcTo = this.getSliceArc(subSlice[1], absTotal))) {
					continue;
				}
				
				// Draw slice:
				subSliceColor = [sliceBaseColor[0], sliceBaseColor[1], Math.max(sliceBaseColor[2] - ((j + 1) * 5), 0)];
				subSliceColor = rgbToHex(hsbToRgb(subSliceColor));
				this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
				ctx.fillStyle = this.getSliceGradient(ctx, dim, dimProp, subSlice[1], subSliceColor);
				ctx.fill();
				
				// Draw a second overlay slice for visual effect:
				this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
				ctx.fillStyle = oGradient;
				ctx.fill();
				
				// Draw slice outline:
				this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
				ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
				ctx.stroke();
				
				arcFrom += arcTo;
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.drawInnerSlices = function(ctx, dim, absTotal) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    dimProp = "innerRadius", 
		    oGradient = this.getSliceOverlayGradient(ctx, dim, dimProp), 
		    slice, sliceAbsTotal, sliceTotal, 
		    subSlices, j, subSlice, arcFrom, arcTo;
		
		arcFrom = Math.PI / -2.0;
		while ((slice = slices[--i])) {
			subSlices = slice[1];
			j = (subSlices || []).length;
			sliceAbsTotal = sliceTotal = 0;
			while ((subSlice = subSlices[--j])) {
				sliceTotal += subSlice[1] || 0;
				sliceAbsTotal += Math.abs(subSlice[1] || 0);
			}
			if (!(arcTo = this.getSliceArc(sliceAbsTotal, absTotal))) {
				continue;
			}
			
			// Draw slice:
			this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
			ctx.fillStyle = this.getSliceGradient(ctx, dim, dimProp, sliceTotal, slice[3]);
			ctx.fill();
			
			// Draw a second overlay slice for visual effect:
			this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
			ctx.fillStyle = oGradient;
			ctx.fill();
			
			// Draw slice outline:
			this.traceSliceArc(ctx, dim, dimProp, arcFrom, arcTo);
			ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
			ctx.stroke();
			
			arcFrom += arcTo;
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.drawCenter = function(ctx, dim) {
		var fillStyles = ["#dddddd", "#eeeeee", "#ffffff"], 
		    offset;
		
		// Draw inner white circle with shadow:
		for (var i=0; i<3; i++) {
			offset = Math.ceil(i / 2.0);
			
			ctx.beginPath();
			ctx.moveTo(dim.center + offset, dim.center + offset);
			ctx.arc(dim.center + offset, dim.center + offset, dim.whiteRadius - i, 0, twoPI, false);
			ctx.closePath();
			ctx.fillStyle = fillStyles[i];
			ctx.fill();
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.generateToolTips = function(dim, absTotal, vertices) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    mHtml = [], m = 0, 
		    slice, sliceAbsTotal, 
		    subSlices, j, subSlice, 
		    arcFromBase, arcFrom, arcTo;
		
		arcFromBase = Math.PI / -2.0;
		while ((slice = slices[--i])) {
			sliceAbsTotal = 0;
			subSlices = slice[1];
			j = (subSlices || []).length;
			arcFrom = arcFromBase;
			
			while ((subSlice = subSlices[--j])) {
				sliceAbsTotal += Math.abs(subSlice[1] || 0);
				if ((arcTo = this.getSliceArc(subSlice[1], absTotal))) {
					mHtml[m++] = this.generateMapElementArea(i + "-" + j, dim, arcFrom, arcTo, vertices, true);
					this.toolTips[i + "-" + j] = "<strong>" + subSlice[0] + "</strong><br>" + slice[0] + "<br>" + 
					                             ((subSlice[2]) ? subSlice[2] + "<br>" : "") + 
					                             this.getPctForDisplay(subSlice[1], absTotal) + "%";
					arcFrom += arcTo;
				}
			}
			
			if ((arcTo = this.getSliceArc(sliceAbsTotal, absTotal))) {
				mHtml[m++] = this.generateMapElementArea(i, dim, arcFromBase, arcTo, vertices, false);
				this.toolTips[i] = "<strong>" + slice[0] + "</strong><br>" + 
				                   this.getPctForDisplay(sliceAbsTotal, absTotal) + "%";
				arcFromBase += arcTo;
			}
		}
		
		this.generateToolTipElements(dim, mHtml.join(""));
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.generateMapElementArea = function(idx, dim, arcFrom, arcTo, vertices, isSubSlice) {
		var dimPropFrom = (isSubSlice) ? "innerRadius" : "whiteRadius", 
		    dimPropTo = (isSubSlice) ? "radius" : "innerRadius", 
		    round = Math.round, cos = Math.cos, sin = Math.sin, 
		    arcVertices = Math.max(round((arcTo / twoPI) * vertices) - 2, 0), 
		    arcIncr = arcTo / Math.max(arcVertices, 1), 
		    coords = [], c = 0;
		
		// Inner arc:
		coords[c++] = dim.center + round(cos(arcFrom) * dim[dimPropFrom]);
		coords[c++] = dim.center + round(sin(arcFrom) * dim[dimPropFrom]);
		for (var v=1; v<=arcVertices; v++) {
			coords[c++] = dim.center + round(cos(arcFrom + (arcIncr * v)) * dim[dimPropFrom]);
			coords[c++] = dim.center + round(sin(arcFrom + (arcIncr * v)) * dim[dimPropFrom]);
		}
		coords[c++] = dim.center + round(cos(arcFrom + arcTo) * dim[dimPropFrom]);
		coords[c++] = dim.center + round(sin(arcFrom + arcTo) * dim[dimPropFrom]);
		
		// Outer arc:
		coords[c++] = dim.center + round(cos(arcFrom + arcTo) * dim[dimPropTo]);
		coords[c++] = dim.center + round(sin(arcFrom + arcTo) * dim[dimPropTo]);
		for (var v=arcVertices; v>0; v--) {
			coords[c++] = dim.center + round(cos(arcFrom + (arcIncr * v)) * dim[dimPropTo]);
			coords[c++] = dim.center + round(sin(arcFrom + (arcIncr * v)) * dim[dimPropTo]);
		}
		coords[c++] = dim.center + round(cos(arcFrom) * dim[dimPropTo]);
		coords[c++] = dim.center + round(sin(arcFrom) * dim[dimPropTo]);
		coords[c++] = dim.center + round(cos(arcFrom) * dim[dimPropFrom]);
		coords[c++] = dim.center + round(sin(arcFrom) * dim[dimPropFrom]);
		
		return ["<AREA index='", idx, "' shape='poly' coords='", coords.join(","), "'>"].join("");
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.getRegionLabelByTooltipIndex = function(tooltipIdx) {
		var indexes = tooltipIdx.split("-"), 
		    idx, slice, subSlice;
		
		if (!isNaN((idx = parseInt("" + indexes[0], 10))) && (slice = this.options.chartData[idx]) && slice.length) {
			if (!isNaN((idx = parseInt("" + indexes[1], 10))) && (subSlice = slice[1][idx]) && subSlice.length) {
				return [subSlice[0] || "", slice[0] || ""];
			} else {
				return [slice[0] || ""];
			}
		}
		return ["", ""];
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.updateData = function(newData) {
		var slices = this.options.chartData, 
		    animate = (!usingExCanvas), 
		    animateData = [], 
		    subSlices, newSubSlices;
		
		// Stop any current animations:
		this.animateTimer = (this.animateTimer) ? window.clearTimeout(this.animateTimer) : null;
		
		// Check if animatable:
		if (animate && slices.length === (newData || []).length) {
			for (var i=0, slice, newSlice; (slice=slices[i]) && (newSlice=newData[i]); i++) {
				subSlices = slice[1];
				newSubSlices = newSlice[1] || [];
				if (slice[0] === newSlice[0] && subSlices.length === newSubSlices.length && slice[3] === newSlice[3]) {
					animateData[i] = { "slice" : slice, "newSlice" : newSlice, "incBy" : [] };
					animateData[i]["tempSlice"] = [newSlice[0], [], newSlice[2], newSlice[3]];
					
					for (var j=0, subSlice, newSubSlice; (subSlice=subSlices[j]) && (newSubSlice=newSubSlices[j]); j++) {
						if (subSlice[0] === newSubSlice[0] && subSlice[1] > 0 && newSubSlice[1] > 0) {
							animateData[i]["incBy"][j] = (subSlice[1] - newSubSlice[1]) / animateLoops;
							animateData[i]["tempSlice"][1][j] = newSubSlice.concat();
						} else {
							animate = false;
							break;
						}
					}
				} else {
					animate = false;
					break;
				}
			}
		} else {
			animate = false;
		}
		
		// Animate or simply reinitialize:
		if (animate) {
			this.animate(1, animateData);
		} else {
			this.options.chartData = newData;
			this.cleanUp(true);
			Chart.Ring.apply(this, [this.element, this.options]);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.Ring.prototype.animate = function(counter, animateData) {
		var chartData = [], 
		    pastSubItems, subItems;
		
		// Regenerate chart with temp data:
		if (counter < animateLoops) {
			for (var i=0, item; item=animateData[i]; i++) {
				subItems = item["tempSlice"][1];
				pastSubItems = item["slice"][1];
				for (var j=0, subItem, pastSubItem; (subItem=subItems[j]) && (pastSubItem=pastSubItems[j]); j++) {
					if (item["incBy"][j] < 0) {
						subItem[1] = pastSubItem[1] + (counter * Math.abs(item["incBy"][j]));
					} else {
						subItem[1] = pastSubItem[1] - (counter * item["incBy"][j]);
					}
				}
				chartData[i] = item["tempSlice"];
			}
			this.options.chartData = chartData;
			this.generate(true);
			
			counter++;
			this.animateTimer = window.setTimeout(bind(this.animate, this, [counter, animateData]), animateInt);
			
		// Finalize with new data:
		} else {
			for (var i=0, item; item=animateData[i]; i++) {
				chartData[i] = item["newSlice"];
			}
			this.options.chartData = chartData;
			this.cleanUp(true);
			Chart.Ring.apply(this, [this.element, this.options]);
		}
	};
	
	//////////////////////////////////
	//
	// Utility Methods
	//
	//////////////////////////////////////////////////////////////////////////////////
	var getIEVersion = function() {
		var nav, version;
		
		if ((nav = navigator).appName === "Microsoft Internet Explorer") {
			if (new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})").exec(nav.userAgent)) {
				version = parseFloat(RegExp.$1);
			}
		}
		return (version > 5) ? version : undefined;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var bind = function(func, that, args) {
		var args = [].concat(args || []), 
		    a = args.length;
		
		return function() {
			if (a || arguments.length) {
				for (var i=0, arg; arg=arguments[i]; i++) { args[a+i] = arg; }
				return func.apply(that, args);
			}
			return func.call(that);
		};
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var getEventPagePositions = function(event) {
		var doc;
		
		if (event.pageX === undefined || event.pageY === undefined) {
			doc = (document.documentElement.scrollLeft !== undefined) ? document.documentElement : document.body;
			return { x : event.clientX + doc.scrollLeft, y : event.clientY + doc.scrollTop };
		}
		return { x : event.pageX, y : event.pageY };
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var hexToRgb = function(hex) {
		var cacheKey = "hexToRgb-" + (hex || ""), 
		    rgb = colorCache[cacheKey], 
		    def;
		
		if (!rgb) {
			def = ["#", "FF", "FF", "FF"];
			rgb = hex.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/) || def;
			rgb = (rgb.length === 4) ? rgb.slice(1) : def.slice(1);
			for (var i=0; i<3; i++) {
				rgb[i] = parseInt(((rgb[i].length === 1) ? (rgb[i] + rgb[i]) : rgb[i]), 16);
			}
			colorCache[cacheKey] = rgb;
		}
		return rgb;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var rgbToHex = function(rgb) {
		var cacheKey = "rgbToHex-" + (rgb || ""), 
		    hex = colorCache[cacheKey];
		
		if (!hex) {
			colorCache[cacheKey] = hex = "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
		}
		return hex;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var rgbToHsb = function(rgb) {
		var cacheKey = "rgbToHsb-" + (rgb || ""), 
		    hsb = colorCache[cacheKey], 
		    max, min, delta;
		
		if (!hsb) {
			max = Math.max(rgb[0], rgb[1], rgb[2]);
			min = Math.min(rgb[0], rgb[1], rgb[2]);
			delta = max - min;
			hsb = [0, (max) ? delta / max : 0, max / 255];
			
			if (hsb[1]) {
				if (rgb[0] === max) {
					hsb[0] = ((max - rgb[2]) / delta) - ((max - rgb[1]) / delta);
				} else if (rgb[1] === max) {
					hsb[0] = ((max - rgb[0]) / delta) - ((max - rgb[2]) / delta) + 2;
				} else {
					hsb[0] = ((max - rgb[1]) / delta) - ((max - rgb[0]) / delta) + 4;
				}
				hsb[0] = hsb[0] / 6;
				if (hsb[0] < 0) {
					hsb[0]++;
				}
			}
			
			colorCache[cacheKey] = hsb = [Math.round(hsb[0] * 360), Math.round(hsb[1] * 100), Math.round(hsb[2] * 100)];
		}
		return hsb;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var hsbToRgb = function(hsb) {
		var cacheKey = "hsbToRgb-" + (hsb || ""), 
		    rgb = colorCache[cacheKey], 
		    hue, br, f, p, q, t;
		
		if (!rgb) {
			br = Math.round((hsb[2] / 100) * 255);
			if (!hsb[1]) {
				rgb = [br, br, br];
			} else {
				hue = hsb[0] % 360;
				f = hue % 60;
				p = Math.round(((hsb[2] * (100 - hsb[1])) / 10000) * 255);
				q = Math.round(((hsb[2] * (6000 - (hsb[1] * f))) / 600000) * 255);
				t = Math.round(((hsb[2] * (6000 - (hsb[1] * (60 - f)))) / 600000) * 255);
				switch (Math.floor(hue / 60)) {
					case 0: rgb = [br, t, p]; break;
					case 1: rgb = [q, br, p]; break;
					case 2: rgb = [p, br, t]; break;
					case 3: rgb = [p, q, br]; break;
					case 4: rgb = [t, p, br]; break;
					case 5: rgb = [br, p, q]; break;
					default: rgb = [0, 0, 0]; break;
				}
			}
			colorCache[cacheKey] = rgb;
		}
		return rgb;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var $ = function(elemId) { return document.getElementById(elemId); }, 
	    animateInt = 1000 / 60, 
	    animateLoops = 10, 
	    ieVersion = getIEVersion(), 
	    clearImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12P4zwAAAgEBAKrChTYAAAAASUVORK5CYII=", 
	    colorCache = {}, 
	    dimCacheKey = "chartDim", 
	    twoPI = Math.PI * 2, 
	    usingExCanvas = (ieVersion <= 8);
	
	// Expose:
	window.Chart = { Pie : Chart.Pie, Ring : Chart.Ring };
	
})(this, this.document);

