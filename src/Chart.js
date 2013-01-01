////////////////////////////////////
//
// Chart
// MIT-style license. Copyright 2012 Matt V. Murphy
//
////////////////////////////////////
(function(window, document, undefined) {
	"use strict";
	
	var ChartProto;
	var Chart = function(element, options) {
		if ((this.element = (typeof(element) === "string") ? $(element) : element)) {
			if (this.element.childNodes.length) {
				this.element.innerHTML = "";
			}
			this.animateTimer = null;
			this.cache = {};
			this.chart = null;
			this.toolTip = null;
			this.toolTips = {};
			this.toolTipThrottle = -1;
			this.setOptions(options);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	(ChartProto = Chart.prototype).nothing = function(){};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.setOptions = function(options) {
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
		this.options.selectorSuffix = this.options.selectorSuffix || ("" + mCeil(Math.random() * 50000));
		this.options.showTooltips = (this.options.showTooltips && window.ontouchstart === undefined);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.generateCanvas = function(chartSize) {
		var chart = document.createElement("canvas");
		
		chart.id = this.options.selectorPrefix + "Chart" + this.options.selectorSuffix;
		chart.setAttribute("width", chartSize);
		chart.setAttribute("height", chartSize);
		if (usingExCanvas) {
			G_vmlCanvasManager.initElement(chart);
		}
		return (this.chart = chart);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.drawCircularBase = function(ctx, dim) {
		var fillStyles = ["#ffffff", "#eeeeee", "#dddddd"];
		
		// Draw base circles:
		for (var i=2; i>=0; i--) {
			ctx.beginPath();
			ctx.moveTo(dim.center + i, dim.center + i);
			ctx.arc(dim.center + i, dim.center + i, dim.radius + mFloor(i / 2.0), 0, twoPI, false);
			ctx.closePath();
			ctx.fillStyle = fillStyles[i];
			ctx.fill();
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.getSliceArc = function(part, absTotal) {
		var arc = (mAbs(part || 0) / absTotal) * twoPI;
		return (usingExCanvas && arc === twoPI) ? 0.99999 * arc : arc; // Excanvas does not render a 100% arc slice
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.traceSliceArc = function(ctx, dim, dimProp, arcFrom, arcTo) {
		ctx.beginPath();
		ctx.moveTo(dim.center, dim.center);
		ctx.arc(dim.center, dim.center, dim[dimProp] || dim.radius, arcFrom, arcFrom + arcTo, false);
		ctx.lineTo(dim.center, dim.center);
		ctx.closePath();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.getSliceGradient = function(ctx, dim, dimProp, part, baseColor) {
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
				color = [color[0], mMax(color[1] - 15, 0), mMin(color[2] + 20, 100)];
				gradient.addColorStop(0.0, rgbToHex(hsbToRgb(color)));
				gradient.addColorStop(1.0, baseColor);
			}
			
			this.cache[cacheKey] = gradient;
		}
		
		return gradient;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.getSliceOverlayGradient = function(ctx, dim, dimProp) {
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
	ChartProto.animate = function(counter, chartDataSet) {
		this.options.chartData = chartDataSet[counter];
		
		if (counter < animateLoops) {
			counter++;
			this.animateTimer = window.setTimeout(bind(this.animate, this, counter, chartDataSet), animateInt);
			this.generate(true);
		} else {
			this.cleanUp(true);
			Chart[(this.chartType === "pieChart") ? "Pie" : "Ring"].apply(this, [this.element, this.options]);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.animateUsingExCanvas = function(counter, chartDataSet) {
		var ctx, i;
		
		// Pre-generate each animation frame:
		if (counter === 1) {
			ctx = this.chart.getContext("2d");
			for (i=1; i<animateLoops; i++) {
				this.options.chartData = chartDataSet[i];
				this.generate(true);
				chartDataSet[i][4] = ctx.getBufferOutput(true);
			}
		}
		
		// Display frame:
		this.options.chartData = chartDataSet[counter];
		
		if (counter < animateLoops) {
			counter++;
			this.animateTimer = window.setTimeout(bind(this.animateUsingExCanvas, this, counter, chartDataSet), animateInt);
			this.chart.innerHTML = this.options.chartData[4];
		} else {
			this.cleanUp(true);
			Chart[(this.chartType === "pieChart") ? "Pie" : "Ring"].apply(this, [this.element, this.options]);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.getPctForDisplay = function(part, absTotal) {
		var cacheKey = "pct-" + part + "-" + absTotal, 
		    pct = this.cache[cacheKey];
		
		if (!pct) {
			this.cache[cacheKey] = pct = ((mAbs(part || 0) / absTotal) * 100).toFixed(2);
		}
		return pct;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.generateToolTipElements = function(dim, mapHtml) {
		var prefix = this.options.selectorPrefix, 
		    suffix = this.options.selectorSuffix, 
		    showToolTipBound = bind(this.showToolTip, this), 
		    hideToolTipBound = bind(this.hideToolTip, this), 
		    doc, eCon, eMap, eImg, eDiv, eAreas, eArea, i;
		
		eCon = (doc = document).createElement("div");
		
		// Credits to Greg Houston (http://greghoustondesign.com) for MAP solution
		eMap = doc.createElement("map");
		eMap.id = prefix + "Map" + suffix;
		eMap.name = prefix + "Map" + suffix;
		eMap.className = prefix + "Map" + suffix;
		eMap.innerHTML = mapHtml;
		eMap.onmouseout = hideToolTipBound;
		eCon.appendChild(eMap);
		eAreas = eCon.getElementsByTagName("area");
		for (i=0; eArea=eAreas[i]; i++) {
			eArea.onmousemove = showToolTipBound;
		}
		
		eImg = doc.createElement("img");
		eImg.id = prefix + "Image" + suffix;
		eImg.useMap = "#" + prefix + "Map" + suffix;
		eImg.className = prefix + "Image";
		eImg.src = (ieVersion < 8) ? this.options.clearImgPath : clearImg;
		eImg.style.cssText = "width:" + dim.elementSize.x + "px;height:" + dim.elementSize.y + "px;";
		eCon.appendChild(eImg);
		
		if (!this.toolTip) {
			eDiv = (this.toolTip = doc.createElement("div"));
			eDiv.id = prefix + "Tooltip" + suffix;
			eDiv.className = prefix + "Tooltip";
			doc.body.appendChild(eDiv);
		}
		
		this.element.appendChild(eCon);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.showToolTip = function(event) {
		var event, index, page, top, left;
		
		if ((this.toolTipThrottle++) & 1) {
			index = ((event = event || window.event).target || event.srcElement).getAttribute("index");
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
	ChartProto.hideToolTip = function(event) {
		this.toolTipThrottle = -1;
		this.options.onRegionExit.apply(this, this.getRegionLabelByTooltipIndex(this.lastIndex));
		this.lastIndex = undefined;
		if (!!this.toolTip) {
			this.toolTip.innerHTML = "";
			this.toolTip.style.cssText = "";
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	ChartProto.cleanUp = function(isFromAnimate) {
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
	Chart.PieProto = (Chart.Pie.prototype = new Chart());
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.PieProto.generate = function(isAnimationFrame) {
		var absTotal = this.getAbsoluteTotal(), 
		    dim = this.getDimensions(isAnimationFrame), 
		    chart = this.chart || this.generateCanvas(dim.chartSize), 
		    ctx = chart.getContext("2d");
		
		if (!isAnimationFrame || usingExCanvas) {
			ctx.lineWidth = 1.0;
			ctx.globalCompositeOperation = "source-over";
			ctx.outputToBuffer = true; // For ExCanvas2
			this.drawCircularBase(ctx, dim);
		}
		this.drawSlices(ctx, dim, absTotal);
		if (!isAnimationFrame) {
			this.element.appendChild(chart);
			if (usingExCanvas) {
				chart.innerHTML = ctx.getBufferOutput(true);
			}
			if (this.options.showTooltips) {
				this.generateToolTips(dim, absTotal, 36);
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.PieProto.getAbsoluteTotal = function() {
		var slices = this.options.chartData, 
		    absTotal = 0;
		
		for (var i=0, slice; slice=slices[i]; i++) {
			absTotal += mAbs(slice[1] || 0);
		}
		
		return absTotal;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.PieProto.getDimensions = function(useCache) {
		var dim = (useCache) ? this.cache[dimCacheKey] : null;
		
		if (!dim) {
			dim = { elementSize : { x : this.element.offsetWidth, y : this.element.offsetHeight } };
			dim.chartSize = mMax(this.options.chartMinSize[0], 
			                     this.options.chartMinSize[1], 
			                     mMin(dim.elementSize.x, 
			                          dim.elementSize.y, 
			                          this.options.chartMaxSize[0], 
			                          this.options.chartMaxSize[1]));
			
			dim.center = mFloor(dim.chartSize / 2.0);
			dim.radius = mFloor((dim.chartSize - 20) / 2.0);
			this.cache[dimCacheKey] = dim;
		}
		
		return dim;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.PieProto.drawSlices = function(ctx, dim, absTotal) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    dimProp = "radius", 
		    oGradient = this.getSliceOverlayGradient(ctx, dim, dimProp), 
		    slice, arcFrom, arcTo;
		
		arcFrom = mPI / -2.0;
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
	Chart.PieProto.generateToolTips = function(dim, absTotal, vertices) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    mHtml = [], m = 0, 
		    slice, arcFrom, arcTo;
		
		arcFrom = mPI / -2.0;
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
	Chart.PieProto.generateMapElementArea = function(idx, dim, dimProp, arcFrom, arcTo, vertices) {
		var arcVertices = mMax(mRound((arcTo / twoPI) * vertices) - 2, 0), 
		    arcIncr = arcTo / mMax(arcVertices, 1), 
		    coords = [], c = 0;
		
		dimProp = (dimProp && dim[dimProp] !== undefined) ? dimProp : "radius";
		
		// Calculate area element polygon coordinates (polygon modeled after slice shape):
		coords[c++] = dim.center;
		coords[c++] = dim.center;
		coords[c++] = dim.center + mRound(mCos(arcFrom) * dim[dimProp]);
		coords[c++] = dim.center + mRound(mSin(arcFrom) * dim[dimProp]);
		for (var v=1; v<=arcVertices; v++) {
			coords[c++] = dim.center + mRound(mCos(arcFrom + (arcIncr * v)) * dim[dimProp]);
			coords[c++] = dim.center + mRound(mSin(arcFrom + (arcIncr * v)) * dim[dimProp]);
		}
		coords[c++] = dim.center + mRound(mCos(arcFrom + arcTo) * dim[dimProp]);
		coords[c++] = dim.center + mRound(mSin(arcFrom + arcTo) * dim[dimProp]);
		coords[c++] = dim.center;
		coords[c++] = dim.center;
		return ["<AREA index='", idx, "' shape='poly' coords='", coords.join(","), "'>"].join("");
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.PieProto.getRegionLabelByTooltipIndex = function(tooltipIdx) {
		var tooltipIdx = parseInt("" + tooltipIdx, 10), 
		    slice = (!isNaN(tooltipIdx)) ? this.options.chartData[tooltipIdx] || [] : [];
		
		return [(slice.length) ? slice[0] || "" : ""];
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.PieProto.updateData = function(newData) {
		var animate, cDSet, oS, oSLabel, oSPct, oSColor, nS, incBy, incDir, i, j, 
		    slices = this.options.chartData, 
		    numFrames = animateLoops;
		
		// Stop any current animations:
		this.animateTimer = (this.animateTimer) ? window.clearTimeout(this.animateTimer) : null;
		
		// Check if animatable, generate each frame's chartData:
		if ((animate = (slices.length === (newData || []).length))) {
			cDSet = [slices];
			for (i=1; i<numFrames; i++) { cDSet[i] = []; }
			cDSet[numFrames] = newData;
			
			for (i=0; (oS=slices[i]) && (nS=newData[i]); i++) {
				if ((animate = (oS[0] === nS[0] && oS[1] >= 0 && nS[1] >= 0 && oS[3] === nS[3]))) {
					oSLabel = oS[0];
					oSPct = oS[1];
					incBy = (oSPct - nS[1]) / numFrames;
					incDir = (incBy < 0) ? 1 : -1;
					oSColor = oS[3];
					for (j=1; j<numFrames; j++) {
						cDSet[j][i] = [oSLabel, oSPct + (j * mAbs(incBy) * incDir), null, oSColor];
					}
				} else {
					break;
				}
			}
		}
		
		// Animate or simply reinitialize:
		if (animate) {
			this[(!usingExCanvas) ? "animate" : "animateUsingExCanvas"](1, cDSet);
		} else {
			this.options.chartData = newData;
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
	Chart.RingProto = (Chart.Ring.prototype = new Chart());
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.RingProto.generate = function(isAnimationFrame) {
		var absTotal = this.getAbsoluteTotal(), 
		    dim = this.getDimensions(isAnimationFrame), 
		    chart = this.chart || this.generateCanvas(dim.chartSize), 
		    ctx = chart.getContext("2d");
		
		if (!isAnimationFrame || usingExCanvas) {
			ctx.lineWidth = 1.0;
			ctx.globalCompositeOperation = "source-over";
			ctx.outputToBuffer = true; // For ExCanvas2
			this.drawCircularBase(ctx, dim);
		}
		this.drawOuterSlices(ctx, dim, absTotal);
		this.drawInnerSlices(ctx, dim, absTotal);
		this.drawCenter(ctx, dim);
		if (!isAnimationFrame) {
			this.element.appendChild(chart);
			if (usingExCanvas) {
				chart.innerHTML = ctx.getBufferOutput(true);
			}
			if (this.options.showTooltips) {
				this.generateToolTips(dim, absTotal, 36);
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.RingProto.getAbsoluteTotal = function() {
		var slices = this.options.chartData, 
		    absTotal = 0, 
		    subSlices;
		
		for (var i=0, slice; slice=slices[i]; i++) {
			subSlices = slice[1] || [];
			for (var j=0, subSlice; subSlice=subSlices[j]; j++) {
				absTotal += mAbs(subSlice[1] || 0);
			}
		}
		
		return absTotal;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.RingProto.getDimensions = function(useCache) {
		var dim = (useCache) ? this.cache[dimCacheKey] : null;
		
		if (!dim) {
			dim = { elementSize : { x : this.element.offsetWidth, y : this.element.offsetHeight } };
			dim.chartSize = mMax(this.options.chartMinSize[0], 
			                     this.options.chartMinSize[1], 
			                     mMin(dim.elementSize.x, 
			                          dim.elementSize.y, 
			                          this.options.chartMaxSize[0], 
			                          this.options.chartMaxSize[1]));
			
			dim.center = mFloor(dim.chartSize / 2.0);
			dim.radius = mFloor((dim.chartSize - 20) / 2.0);
			dim.ratios = { outerRing : 0.25, innerRing : 0.35, white : 0.40 };
			dim.innerRadius = mRound(dim.radius * (dim.ratios.innerRing + dim.ratios.white));
			dim.whiteRadius = mRound(dim.radius * dim.ratios.white);
			this.cache[dimCacheKey] = dim;
		}
		
		return dim;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.RingProto.drawOuterSlices = function(ctx, dim, absTotal) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    dimProp = "radius", 
		    oGradient = this.getSliceOverlayGradient(ctx, dim, dimProp), 
		    slice, sliceBaseColor, 
		    subSlices, j, subSlice, subSliceColor, 
		    arcFrom, arcTo;
		
		arcFrom = mPI / -2.0;
		while ((slice = slices[--i])) {
			subSlices = slice[1];
			j = (subSlices || []).length;
			sliceBaseColor = rgbToHsb(hexToRgb(slice[3]));
			
			while ((subSlice = subSlices[--j])) {
				if (!(arcTo = this.getSliceArc(subSlice[1], absTotal))) {
					continue;
				}
				
				// Draw slice:
				subSliceColor = [sliceBaseColor[0], sliceBaseColor[1], mMax(sliceBaseColor[2] - ((j + 1) * 5), 0)];
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
	Chart.RingProto.drawInnerSlices = function(ctx, dim, absTotal) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    dimProp = "innerRadius", 
		    oGradient = this.getSliceOverlayGradient(ctx, dim, dimProp), 
		    slice, sliceAbsTotal, sliceTotal, 
		    subSlices, j, subSlice, arcFrom, arcTo;
		
		arcFrom = mPI / -2.0;
		while ((slice = slices[--i])) {
			subSlices = slice[1];
			j = (subSlices || []).length;
			sliceAbsTotal = sliceTotal = 0;
			while ((subSlice = subSlices[--j])) {
				sliceTotal += subSlice[1] || 0;
				sliceAbsTotal += mAbs(subSlice[1] || 0);
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
	Chart.RingProto.drawCenter = function(ctx, dim) {
		var fillStyles = ["#dddddd", "#eeeeee", "#ffffff"], 
		    offset;
		
		// Draw inner white circle with shadow:
		for (var i=0; i<3; i++) {
			offset = mCeil(i / 2.0);
			
			ctx.beginPath();
			ctx.moveTo(dim.center + offset, dim.center + offset);
			ctx.arc(dim.center + offset, dim.center + offset, dim.whiteRadius - i, 0, twoPI, false);
			ctx.closePath();
			ctx.fillStyle = fillStyles[i];
			ctx.fill();
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.RingProto.generateToolTips = function(dim, absTotal, vertices) {
		var slices = this.options.chartData, 
		    i = slices.length, 
		    mHtml = [], m = 0, 
		    slice, sliceAbsTotal, 
		    subSlices, j, subSlice, 
		    arcFromBase, arcFrom, arcTo;
		
		arcFromBase = mPI / -2.0;
		while ((slice = slices[--i])) {
			sliceAbsTotal = 0;
			subSlices = slice[1];
			j = (subSlices || []).length;
			arcFrom = arcFromBase;
			
			while ((subSlice = subSlices[--j])) {
				sliceAbsTotal += mAbs(subSlice[1] || 0);
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
	Chart.RingProto.generateMapElementArea = function(idx, dim, arcFrom, arcTo, vertices, isSubSlice) {
		var dimPropFrom = (isSubSlice) ? "innerRadius" : "whiteRadius", 
		    dimPropTo = (isSubSlice) ? "radius" : "innerRadius", 
		    arcVertices = mMax(mRound((arcTo / twoPI) * vertices) - 2, 0), 
		    arcIncr = arcTo / mMax(arcVertices, 1), 
		    coords = [], c = 0;
		
		// Inner arc:
		coords[c++] = dim.center + mRound(mCos(arcFrom) * dim[dimPropFrom]);
		coords[c++] = dim.center + mRound(mSin(arcFrom) * dim[dimPropFrom]);
		for (var v=1; v<=arcVertices; v++) {
			coords[c++] = dim.center + mRound(mCos(arcFrom + (arcIncr * v)) * dim[dimPropFrom]);
			coords[c++] = dim.center + mRound(mSin(arcFrom + (arcIncr * v)) * dim[dimPropFrom]);
		}
		coords[c++] = dim.center + mRound(mCos(arcFrom + arcTo) * dim[dimPropFrom]);
		coords[c++] = dim.center + mRound(mSin(arcFrom + arcTo) * dim[dimPropFrom]);
		
		// Outer arc:
		coords[c++] = dim.center + mRound(mCos(arcFrom + arcTo) * dim[dimPropTo]);
		coords[c++] = dim.center + mRound(mSin(arcFrom + arcTo) * dim[dimPropTo]);
		for (var v=arcVertices; v>0; v--) {
			coords[c++] = dim.center + mRound(mCos(arcFrom + (arcIncr * v)) * dim[dimPropTo]);
			coords[c++] = dim.center + mRound(mSin(arcFrom + (arcIncr * v)) * dim[dimPropTo]);
		}
		coords[c++] = dim.center + mRound(mCos(arcFrom) * dim[dimPropTo]);
		coords[c++] = dim.center + mRound(mSin(arcFrom) * dim[dimPropTo]);
		coords[c++] = dim.center + mRound(mCos(arcFrom) * dim[dimPropFrom]);
		coords[c++] = dim.center + mRound(mSin(arcFrom) * dim[dimPropFrom]);
		
		return ["<AREA index='", idx, "' shape='poly' coords='", coords.join(","), "'>"].join("");
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Chart.RingProto.getRegionLabelByTooltipIndex = function(tooltipIdx) {
		var indexes = ("" + tooltipIdx).split("-"), 
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
	Chart.RingProto.updateData = function(newData) {
		var animate, cDSet, oS, oSLabel, oSColor, oSSubs, oSS, oSSPct, nS, nSS, nSSubs, incBy, incDir, i, j, k, 
		    slices = this.options.chartData, 
		    numFrames = animateLoops;
		
		// Stop any current animations:
		this.animateTimer = (this.animateTimer) ? window.clearTimeout(this.animateTimer) : null;
		
		// Check if animatable, generate each frame's chartData:
		if ((animate = (slices.length === (newData || []).length))) {
			cDSet = [slices];
			for (i=1; i<numFrames; i++) { cDSet[i] = []; }
			cDSet[numFrames] = newData;
			
			for (i=0; (oS=slices[i]) && (nS=newData[i]); i++) {
				oSSubs = oS[1];
				nSSubs = nS[1] || [];
				if (animate && (animate = (oS[0] === nS[0] && oSSubs.length === nSSubs.length && oS[3] === nS[3]))) {
					oSLabel = oS[0];
					oSColor = oS[3];
					for (j=1; j<numFrames; j++) {
						cDSet[j][i] = [oSLabel, [], null, oSColor];
					}
					
					for (k=0; (oSS=oSSubs[k]) && (nSS=nSSubs[k]); k++) {
						if ((animate = (oSS[0] === nSS[0] && oSS[1] >= 0 && nSS[1] >= 0))) {
							oSLabel = oSS[0];
							oSSPct = oSS[1];
							incBy = (oSSPct - nSS[1]) / numFrames;
							incDir = (incBy < 0) ? 1 : -1;
							for (j=1; j<numFrames; j++) {
								cDSet[j][i][1][k] = [oSLabel, oSSPct + (j * mAbs(incBy) * incDir), null];
							}
						} else {
							break;
						}
					}
				} else {
					break;
				}
			}
		}
		
		// Animate or simply reinitialize:
		if (animate) {
			this[(!usingExCanvas) ? "animate" : "animateUsingExCanvas"](1, cDSet);
		} else {
			this.options.chartData = newData;
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
	var bind = function(func, that) {
		var a = slice.call(arguments, 2);
		return function() { return func.apply(that, a.concat(slice.call(arguments))); };
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
			max = mMax(rgb[0], rgb[1], rgb[2]);
			min = mMin(rgb[0], rgb[1], rgb[2]);
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
			
			colorCache[cacheKey] = hsb = [mRound(hsb[0] * 360), mRound(hsb[1] * 100), mRound(hsb[2] * 100)];
		}
		return hsb;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var hsbToRgb = function(hsb) {
		var cacheKey = "hsbToRgb-" + (hsb || ""), 
		    rgb = colorCache[cacheKey], 
		    hue, br, f, p, q, t;
		
		if (!rgb) {
			br = mRound((hsb[2] / 100) * 255);
			if (!hsb[1]) {
				rgb = [br, br, br];
			} else {
				hue = hsb[0] % 360;
				f = hue % 60;
				p = mRound(((hsb[2] * (100 - hsb[1])) / 10000) * 255);
				q = mRound(((hsb[2] * (6000 - (hsb[1] * f))) / 600000) * 255);
				t = mRound(((hsb[2] * (6000 - (hsb[1] * (60 - f)))) / 600000) * 255);
				switch (mFloor(hue / 60)) {
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
	var mAbs = Math.abs, mFloor = Math.floor, mCeil = Math.ceil, mRound = Math.round, 
	    mSin = Math.sin, mCos = Math.cos, mMax = Math.max, mMin = Math.min, mPI = Math.PI, 
	    $ = function(elemId) { return document.getElementById(elemId); }, 
	    slice = Array.prototype.slice, 
	    ieVersion = getIEVersion(), 
	    usingExCanvas = (ieVersion <= 8), 
	    animateInt = 1000 / ((usingExCanvas) ? 40 : 60), 
	    animateLoops = (usingExCanvas) ? 6 : 10, 
	    clearImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12P4zwAAAgEBAKrChTYAAAAASUVORK5CYII=", 
	    colorCache = {}, 
	    dimCacheKey = "chartDim", 
	    twoPI = mPI * 2;
	
	// Expose:
	window.Chart = { Pie : Chart.Pie, Ring : Chart.Ring };
	
})(this, this.document);

