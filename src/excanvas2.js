////////////////////////////////////
//
// ExCanvas2
// A modification of ExCanvas.js by Google Inc.
// MIT-style license. Copyright 2012 Matt V. Murphy
//
////////////////////////////////////
(function(window, document, undefined) {
	"use strict";
	if (document.createElement("canvas").getContext) {
		return;
	}
	
	var G_vmlCanvasManager = {};
	
	//////////////////////////////////////////////////////////////////////////////////
	G_vmlCanvasManager.init = function(doc) {
		// Create a dummy element so that IE will allow canvas elements to be recognized:
		(doc || (doc = document)).createElement("canvas");
		
		// Add namespaces and stylesheet:
		this.addNamespacesAndStylesheet(doc);
		
		// Initialize when DOM is ready:
		if (doc.readyState === "complete") {
			this.initElements(doc);
		} else {
			this.boundInit = bind(this.initElements, this, doc);
			doc.attachEvent("onreadystatechange", this.boundInit);
			if (doc.parentWindow === window) {
				window.attachEvent("load", this.boundInit);
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	G_vmlCanvasManager.initElements = function(doc) {
		var elems, elem, i;
		
		// Detach bound DOM ready function:
		if (this.boundInit) {
			doc.detachEvent("onreadystatechange", this.boundInit);
			if (doc.parentWindow === window) {
				window.detachEvent("load", this.boundInit);
			}
			this.boundInit = null;
		}
		
		// Find all canvas elements:
		elems = doc.getElementsByTagName("canvas");
		for (i=0; elem=elems[i]; i++) {
			this.initElement(elem);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	G_vmlCanvasManager.initElement = function(elem) {
		var aWidth, aHeight, elemDim;
		
		if (!elem.getContext) {
			if (elem.childNodes.length) {
				elem.innerHTML = ""; // Remove fallback content
			}
			aWidth = ((aWidth = elem.attributes.width) && aWidth.specified) ? aWidth.nodeValue : "";
			aHeight = ((aHeight = elem.attributes.height) && aHeight.specified) ? aHeight.nodeValue : "";
			elemDim = { width : aWidth || elem.clientWidth, height : aHeight || elem.clientHeight };
			
			elem.style.width = elemDim.width + "px";
			elem.style.height = elemDim.height + "px";
			elem.attachEvent("onpropertychange", bind(this.onElementPropertyChange, this));
			elem.getContext = bind(this.getElementContext, this, elem);
			
			this.addNamespacesAndStylesheet(elem.ownerDocument);
		}
		return elem;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	G_vmlCanvasManager.getElementContext = function(elem) {
		return elem.context_ || (elem.context_ = new CanvasRenderingContext2D(elem));
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	G_vmlCanvasManager.onElementPropertyChange = function(event) {
		var propName = (event = event || window.event).propertyName, 
		    elem;
		
		if (propName === "width" || propName === "height") {
			(elem = event.srcElement).getElementContext().clearRect();
			elem.style[propName] = elem.attributes[propName].nodeValue + "px";
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	G_vmlCanvasManager.addNamespacesAndStylesheet = function(doc) {
		var ns = [["g_vml_", "vml"], ["g_o_", "office:office"]], 
		    namespaces = doc.namespaces, 
		    ss, i;
		
		// Add namespaces:
		for (i=0; i<2; i++) {
			if (!namespaces[ns[i][0]]) {
				namespaces.add(ns[i][0], "urn:schemas-microsoft-com:" + ns[i][1], "#default#VML");
			}
		}
		
		// Setup default CSS. Only add one style sheet per document:
		if (!doc.styleSheets["ex_canvas_"]) {
			(ss = doc.createStyleSheet()).owningElement.id = "ex_canvas_";
			ss.cssText = "canvas{display:inline-block;overflow:hidden;text-align:left;width:300px;height:150px}";
		}
	};
	
	//////////////////////////////////
	//
	// CanvasRenderingContext2D
	//
	//////////////////////////////////////////////////////////////////////////////////
	var CanvasRenderingContext2DProto;
	var CanvasRenderingContext2D = function(elem) {
		this.m = createMatrixIdentity();
		this.mStack = [];
		this.aStack = [];
		this.currentPath = [];
		
		this.strokeStyle = "#000";
		this.fillStyle = "#000";
		this.lineWidth = 1;
		this.lineJoin = "miter";
		this.lineCap = "butt";
		this.miterLimit = 10;
		this.globalAlpha = 1;
		this.font = "10px sans-serif";
		this.textAlign = "left";
		this.textBaseline = "alphabetic";
		this.canvas = elem;
		
		this.arcScaleX = 1;
		this.arcScaleY = 1;
		this.lineScale = 1;
		
		/* Non-standard. Set outputToBuffer = true to add generated VML to buffer instead of DOM
		/* Call this.getBufferOutput(clearBuffer) to get generated VML as string
		/* Performance-wise this is beneficial if you wish to generate lots of shapes before 
		/* rendering a whole canvas. */
		this.buffer = [];
		this.outputToBuffer = false;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	(CanvasRenderingContext2DProto = CanvasRenderingContext2D.prototype).save = function() {
		var attrs = {};
		
		CanvasRenderingContext2D.copyState(this, attrs);
		this.aStack.push(attrs);
		this.mStack.push(this.m);
		this.m = matrixMultiply(createMatrixIdentity(), this.m);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.restore = function() {
		if (this.aStack.length) {
			CanvasRenderingContext2D.copyState(this.aStack.pop(), this);
			this.m = this.mStack.pop();
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.beginPath = function() {
		this.currentPath = [];
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.moveTo = function(x, y) {
		var c = getCoords(this.m, x, y);
		
		this.currentX = c.x;
		this.currentY = c.y;
		this.currentPath.push({ type : "moveTo", x : c.x, y : c.y });
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.lineTo = function(x, y) {
		var c = getCoords(this.m, x, y);
		
		this.currentX = c.x;
		this.currentY = c.y;
		this.currentPath.push({ type : "lineTo", x : c.x, y : c.y });
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
		var c1 = getCoords(this.m, cp1x, cp1y), 
		    c2 = getCoords(this.m, cp2x, cp2y), 
		    c = getCoords(this.m, x, y);
		
		this.currentX = c.x;
		this.currentY = c.y;
		this.currentPath.push({
			type : "bezierCurveTo", 
			cp1x : c1.x, 
			cp1y : c1.y, 
			cp2x : c2.x, 
			cp2y : c2.y, 
			x : c.x, 
			y : c.y
		});
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.quadraticCurveTo = function(cp1x, cp1y, x, y) {
		var c1 = getCoords(this.m, cp1x, cp1y), 
		    c = getCoords(this.m, x, y), 
		    c2 = {};
		
		c1.x = this.currentX + 2.0 / 3.0 * (c1.x - this.currentX);
		c1.y = this.currentY + 2.0 / 3.0 * (c1.y - this.currentY);
		c2.x = c1.x + (c.x - this.currentX) / 3.0;
		c2.y = c1.y + (c.y - this.currentY) / 3.0;
		
		this.currentX = c.x;
		this.currentY = c.y;
		this.currentPath.push({
			type : "quadraticCurveTo", 
			cp1x : c1.x, 
			cp1y : c1.y, 
			cp2x : c2.x, 
			cp2y : c2.y, 
			x : c.x, 
			y : c.y
		});
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.arc = function(x, y, r, sAngle, eAngle, clockwise) {
		var c, cStart, cEnd, xStart, yStart, xEnd, yEnd;
		
		r = r * 10;
		xStart = x + cos(sAngle) * r - 5;
		yStart = y + sin(sAngle) * r - 5;
		xEnd = x + cos(eAngle) * r - 5;
		yEnd = y + sin(eAngle) * r - 5;
		xStart += ((xStart === xEnd && !clockwise) ? 0.125 : 0); // IE bug workaround
		
		c = getCoords(this.m, x, y);
		cStart = getCoords(this.m, xStart, yStart);
		cEnd = getCoords(this.m, xEnd, yEnd);
		
		this.currentPath.push({
			type : (clockwise) ? "at" : "wa", 
			x : c.x, 
			y : c.y, 
			radius : r, 
			xStart : cStart.x, 
			yStart : cStart.y, 
			xEnd : cEnd.x, 
			yEnd : cEnd.y
		});
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.rect = function(x, y, width, height) {
		this.moveTo(x, y);
		this.lineTo(x + width, y);
		this.lineTo(x + width, y + height);
		this.lineTo(x, y + height);
		this.closePath();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.strokeRect = function(x, y, width, height) {
		var cPath = this.currentPath;
		
		this.beginPath();
		this.moveTo(x, y);
		this.lineTo(x + width, y);
		this.lineTo(x + width, y + height);
		this.lineTo(x, y + height);
		this.closePath();
		this.stroke();
		this.currentPath = cPath;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.fillRect = function(x, y, width, height) {
		var cPath = this.currentPath;
		
		this.beginPath();
		this.moveTo(x, y);
		this.lineTo(x + width, y);
		this.lineTo(x + width, y + height);
		this.lineTo(x, y + height);
		this.closePath();
		this.fill();
		this.currentPath = cPath;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.clearRect = function() {
		this.buffer = [];
		this.textMeasureElem = null;
		this.canvas.innerHTML = "";
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.closePath = function() {
		this.currentPath.push({ type : "close" });
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.createLinearGradient = function(x0, y0, x1, y1) {
		var gradient = new CanvasGradient("gradient");
		
		gradient.x0 = x0;
		gradient.y0 = y0;
		gradient.x1 = x1;
		gradient.y1 = y1;
		return gradient;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.createRadialGradient = function(x0, y0, r0, x1, y1, r1) {
		var gradient = new CanvasGradient("gradientradial");
		
		gradient.x0 = x0;
		gradient.y0 = y0;
		gradient.r0 = r0;
		gradient.x1 = x1;
		gradient.y1 = y1;
		gradient.r1 = r1;
		return gradient;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.createPattern = function(image, repetition) {
		return new CanvasPattern(image, repetition);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.fill = function() {
		this.stroke(true);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.stroke = function(doFill) {
		var min = { x : [], y : [], xx : 0, yy : 0 }, 
		    max = { x : [], y : [], xx : 0, yy : 0 }, 
		    vml = [], v = 0, 
		    pth, p, rX, rY;
		
		vml[v++] = "<g_vml_:shape filled='" + (doFill = !!doFill) + "' stroked='" + (!doFill) + "'";
		vml[v++] = " style='position:absolute;width:10px;height:10px;'";
		vml[v++] = " coordorigin='0,0' coordsize='100,100' path='";
		for (p=0; pth=this.currentPath[p]; p++) {
			switch (pth.type) {
				case "moveTo":
					vml[v++] = " m " + round(pth.x) + "," + round(pth.y);
					break;
				case "lineTo":
					vml[v++] = " l " + round(pth.x) + "," + round(pth.y);
					break;
				case "close":
					vml[v++] = " x ";
					break;
				case "bezierCurveTo":
				case "quadraticCurveTo":
					vml[v++] = " c " + round(pth.cp1x) + "," + round(pth.cp1y) + "," + round(pth.cp2x);
					vml[v++] = "," + round(pth.cp2y) + "," + round(pth.x) + "," + round(pth.y);
					break;
				case "at":
				case "wa":
					rX = this.arcScaleX * pth.radius;
					rY = this.arcScaleY * pth.radius;
					vml[v++] = " " + pth.type + " " + round(pth.x - rX) + "," + round(pth.y - rY) + " ";
					vml[v++] = round(pth.x + rX) + "," + round(pth.y + rY) + " " + round(pth.xStart);
					vml[v++] = "," + round(pth.yStart) + " " + round(pth.xEnd) + "," + round(pth.yEnd);
					break;
			}
			if (doFill && pth.type !== "close") {
				min.x[min.xx++] = (max.x[max.xx++] = pth.x);
				min.y[min.yy++] = (max.y[max.yy++] = pth.y);
			}
		}
		vml[v++] = "'>";
		if (doFill) {
			min = { x : mMin.apply(this, min.x), y : mMin.apply(this, min.y) };
			max = { x : mMax.apply(this, max.x), y : mMax.apply(this, max.y) };
			vml[v++] = CanvasRenderingContext2D.getFill(this, min, max);
		} else {
			vml[v++] = CanvasRenderingContext2D.getStroke(this);
		}
		vml[v++] = "</g_vml_:shape>";
		
		if (this.outputToBuffer) {
			push.apply(this.buffer, vml);
		} else {
			this.canvas.insertAdjacentHTML("beforeend", vml.join(""));
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.translate = function(x, y) {
		var m = [[1, 0, 0], [0, 1, 0], [x, y, 1]];
		
		CanvasRenderingContext2D.setMatrix(this, matrixMultiply(m, this.m), false);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.rotate = function(rot) {
		var c = cos(rot), 
		    s = sin(rot), 
		    m = [[c, s, 0], [-s, c, 0], [0, 0, 1]];
		
		CanvasRenderingContext2D.setMatrix(this, matrixMultiply(m, this.m), false);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.scale = function(x, y) {
		var m = [[0, 0, 0], [0, 0, 0], [0, 0, 1]];
		
		m[0][0] = (this.arcScaleX = this.arcScaleX * x);
		m[1][1] = (this.arcScaleY = this.arcScaleY * y);
		CanvasRenderingContext2D.setMatrix(this, matrixMultiply(m, this.m), true);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.transform = function(m11, m12, m21, m22, dx, dy) {
		var m = [[m11, m12, 0], [m21, m22, 0], [dx, dy, 1]];
		
		CanvasRenderingContext2D.setMatrix(this, matrixMultiply(m, this.m), true);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.setTransform = function(m11, m12, m21, m22, dx, dy) {
 		var m = [[m11, m12, 0], [m21, m22, 0], [dx, dy, 1]];
 		
 		CanvasRenderingContext2D.setMatrix(this, m, true);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.drawImage = function(image, args) {
		var runtime, styles, m, a, w, h, dx, dy, dw, dh, sx, sy, sw, sh, c1, c2, c3, c4, cMax, 
		    applyFilter = ((m = this.m)[0][0] !== 1 || m[0][1] || m[1][1] !== 1 || m[1][0]), 
		    vml = [], v = 0;
		
		// Get the original image size:
		styles = { w : (runtime = image.runtimeStyle).width, h : runtime.height };
		runtime.height = (runtime.width = "auto");
		w = image.width;
		h = image.height;
		runtime.width = styles.w;
		runtime.height = styles.h;
		
		// Assign arguments:
		if (!{ 3 : 1, 5 : 1, 9 : 1 }[(a = arguments.length)]) {
			throw Error("Invalid number of arguments");
		}
		dx = arguments[(a !== 9) ? 1 : 5];
		dy = arguments[(a !== 9) ? 2 : 6];
		dw = (a === 3) ? w : arguments[(a === 5) ? 3 : 7];
		dh = (a === 3) ? h : arguments[(a === 5) ? 4 : 8];
		sx = (a !== 9) ? 0 : arguments[1];
		sy = (a !== 9) ? 0 : arguments[2];
		sw = (a !== 9) ? w : arguments[3];
		sh = (a !== 9) ? h : arguments[4];
		
		// Calculate coordinates:
		c1 = getCoords(m, dx, dy);
		if (applyFilter) {
			c2 = getCoords(m, dx + dw, dy);
			c3 = getCoords(m, dx, dy + dh);
			c4 = getCoords(m, dx + dw, dy + dh);
			cMax = { x : mMax(c1.x, c2.x, c3.x, c4.x), y : mMax(c1.y, c2.y, c3.y, c4.y) };
		}
		
		// Generate VML:
		vml[v++] = "<g_vml_:group coordsize='100,100' coordorigin='0,0'";
		vml[v++] = "  style=\"width:10px;height:10px;position:absolute;";
		if (applyFilter) {
			vml[v++] = "padding:0 " + round(cMax.x / 10) + "px " + round(cMax.y / 10) + "px 0;";
			vml[v++] = "filter:progid:DXImageTransform.Microsoft.Matrix(M11=" + m[0][0] + ",";
			vml[v++] = "M12=" + m[1][0] + ",M21=" + m[0][1] + ",M22=" + m[1][1] + ",Dx=";
			vml[v++] = round(c1.x / 10) + ",Dy=" + round(c1.y / 10) + ",sizingmethod='clip');";
		} else {
			vml[v++] = "top:" + round(c1.y / 10) + "px;left:" + round(c1.x / 10) + "px;";
		}
		vml[v++] = "\"><g_vml_:image src='" + image.src + "' style='width:" + (dw * 10) + "px;";
		vml[v++] = "height:" + (dh * 10) + "px;' cropleft='" + (sx / w) + "'";
		vml[v++] = " croptop='" + (sy / h) + "' cropright='" + ((w - sx - sw) / w) + "'";
		vml[v++] = " cropbottom='" + ((h - sy - sh) / h) + "' /></g_vml_:group>";
		
		if (this.outputToBuffer) {
			push.apply(this.buffer, vml);
		} else {
			this.canvas.insertAdjacentHTML("beforeend", vml.join(""));
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.fillText = function(text, x, y, maxWidth) {
		this.strokeText(text, x, y, maxWidth, true);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.strokeText = function(text, x, y, maxWidth, doFill) {
		var textAlign = this.textAlign.toLowerCase(), 
		    range, c, min, max, skew, skewOffset, 
		    cStyle = this.canvas.currentStyle, 
		    font = getFontData(this.font, cStyle.fontSize), 
		    vml = [], v = 0;
		
		// Ensure proper text alignment:
		textAlign = (/^left|center|right$/.test(textAlign)) ? textAlign : 
		            (textAlign === "end") ? ((cStyle.direction == "ltr") ? "right" : "left") : 
		            (textAlign === "start") ? ((cStyle.direction == "rtl") ? "right" : "left") : "left";
		range = {};
		range.left = { "center" : 500, "right" : 1000 }[textAlign] || 0;
		range.right = { "center" : 500, "right" : 0.05 }[textAlign] || 1000;
		min = { x : -range.left, y : 0 };
		max = { x : range.right, y : font.size };
		
		// Get coordinates and skew:
		y += (this.textBaseline === "hanging" || this.textBaseline === "top") ? (font.size / 1.75) : 
		     (this.textBaseline !== "middle") ? (-font.size / 2.25) : 0;
		c = getCoords(this.m, x, y);
		skewOffset = round(c.x / 10) + "," + round(c.y / 10);
		skew = this.m[0][0].toFixed(3) + "," + this.m[1][0].toFixed(3) + "," + 
		       this.m[0][1].toFixed(3) + "," + this.m[1][1].toFixed(3) + ",0,0";
		
		// Set and escape font and text attributes:
		font = font.style + " " + font.variant + " " + font.weight + " " + font.size + "px " + font.family;
		font = font.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
		text = text.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
		
		// Generate VML:
		vml[v++] = "<g_vml_:line from='" + (-range.left) + " 0' to='" + range.right + " 0.05'";
		vml[v++] = " coordorigin='0 0' coordsize='100 100' filled='" + (doFill = !!doFill) + "'";
		vml[v++] = " stroked='" + (!doFill) + "' style='position:absolute;width:1px;height:1px;'>";
		if (doFill) {
			vml[v++] = CanvasRenderingContext2D.getFill(this, min, max);
		} else {
			vml[v++] = CanvasRenderingContext2D.getStroke(this);
		}
		vml[v++] = " <g_vml_:skew on='t' matrix='" + skew + "' offset='" + skewOffset + "'";
		vml[v++] = "  origin='" + range.left + " 0' /><g_vml_:path textpathok='true' />";
		vml[v++] = " <g_vml_:textpath on='true' string=\"" + text + "\"";
		vml[v++] = "  style=\"v-text-align:" + textAlign + ";font:" + font + "\" />";
		vml[v++] = "</g_vml_:line>";
		
		if (this.outputToBuffer) {
			push.apply(this.buffer, vml);
		} else {
			this.canvas.insertAdjacentHTML("beforeend", vml.join(""));
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.measureText = function(text) {
		var doc = this.canvas.ownerDocument, 
		    elem = doc.createElement("span");
		
		elem.style.cssText = "position:absolute;top:-20000px;left:0;padding:0;margin:0;" + 
		                     "border:none;white-space:pre;font:" + this.font + ";";
		elem.appendChild(doc.createTextNode(text || ""));
		
		if (this.textMeasureElem) {
			this.canvas.replaceChild(elem, this.textMeasureElem);
			this.textMeasureElem = elem;
		} else {
			this.canvas.appendChild((this.textMeasureElem = elem));
		}
		return { width : this.textMeasureElem.offsetWidth };
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.clip = function() {
		// TODO: STUB
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.arcTo = function() {
		// TODO: STUB
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2DProto.getBufferOutput = function(clearBuffer) {
		var vml = this.buffer.join("");
		
		if (clearBuffer) {
			this.buffer = [];
		}
		return vml;
	};
	
	//////////////////////////////////
	//
	// CanvasRenderingContext2D Helper Functions
	//
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2D.copyState = function(from, to) {
		var keys = ["fillStyle", "lineCap", "lineJoin", "lineWidth", "miterLimit", "shadowBlur", 
		            "shadowColor", "shadowOffsetX", "shadowOffsetY", "strokeStyle", "globalAlpha", 
		            "font", "textAlign", "textBaseline", "arcScaleX", "arcScaleY", "lineScale"], 
		    key, k;
		
		k = keys.length;
		while (k) { to[(key = keys[--k])] = from[key]; }
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2D.getStroke = function(ctx) {
		var lineCap = { "butt" : "flat", "round" : "round" }[ctx.lineCap] || "square", 
		    lineWidth = ctx.lineScale * ctx.lineWidth, 
		    strokeStyle = getColorData(ctx.strokeStyle), 
		    opacity = strokeStyle.alpha * ctx.globalAlpha;
		
		opacity = (lineWidth < 1) ? opacity * lineWidth : opacity; // VML min weight is 1px
		
		return "<g_vml_:stroke opacity='" + opacity + "' joinstyle='" + ctx.lineJoin + "'" + 
		       " miterlimit='" + ctx.miterLimit + "' endcap='" + lineCap + "'" + 
		       " weight='" + lineWidth + "px' color='" + strokeStyle.color + "'/>";
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2D.getFill = function(ctx, min, max) {
		var focus, s, e, d, c1, c2, c, o1, o2, a, p1, p2, 
		    fillStyle = ctx.fillStyle, 
		    w = max.x - min.x, 
		    h = max.y - min.y, 
		    stops, stop, i;
		
		// Gradient fill:
		if (fillStyle instanceof CanvasGradient) {
			focus = { x : 0, y : 0 };
			a = (s = 0);
			e = 1;
			
			if (fillStyle.type === "gradient") {
				p1 = getCoords(ctx.m, fillStyle.x0 / ctx.arcScaleX, fillStyle.y0 / ctx.arcScaleY);
				p2 = getCoords(ctx.m, fillStyle.x1 / ctx.arcScaleX, fillStyle.y1 / ctx.arcScaleY);
				a = Math.atan2(p2.x - p1.x, p2.y - p1.y) * 180 / Math.PI;
				a = ((a = (a < 0) ? a + 360 : a) < 1e-6) ? 0 : a; // Must be non-negative and not too small
			} else {
				p1 = getCoords(ctx.m, fillStyle.x0, fillStyle.y0);
				focus = { x : (p1.x - min.x) / w, y : (p1.y - min.y) / h };
				d = mMax((w = w / (ctx.arcScaleX * 10)), (h = h / (ctx.arcScaleY * 10)));
				s = 2 * fillStyle.r0 / d; // Additional offset
				e = 2 * fillStyle.r1 / d - s; // Scale factor for offset
			}
			
			(stops = fillStyle.colors).sort(function(st1, st2) { return st1.offset - st2.offset; }); // Sort for IE
			c1 = stops[0].color;
			c2 = stops[stops.length-1].color;
			o1 = stops[0].alpha * ctx.globalAlpha;
			o2 = stops[stops.length-1].alpha * ctx.globalAlpha;
			c = [];
			for (i=0; stop=stops[i]; i++) { c[i] = (stop.offset * e + s) + " " + stop.color; }
			return "<g_vml_:fill type='" + fillStyle.type + "' method='none' focus='100%'" + 
			       " color='" + c1 + "' color2='" + c2 + "' colors='" + c.join(",") + "'" + 
			       " opacity='" + o2 + "' g_o_:opacity2='" + o1 + "'" + 
			       " angle='" + a + "' focusposition='" + focus.x + "," + focus.y + "' />";
			
		// Pattern fill:
		} else if (fillStyle instanceof CanvasPattern) {
			if (w && isFinite(w) && h && isFinite(h)) {
				w = (-min.x / w) * 2 * ctx.arcScaleX;
				h = (-min.y / h) * 2 * ctx.arcScaleY;
				return "<g_vml_:fill type='tile' src='" + fillStyle.src + "' position='" + w + "," + h + "' />";
			}
		}
		
		// Solid fill:
		return "<g_vml_:fill color='" + (fillStyle = getColorData(fillStyle)).color + "'" + 
		       " opacity='" + (fillStyle.alpha * ctx.globalAlpha) + "' />";
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasRenderingContext2D.setMatrix = function(ctx, m, updateLineScale) {
		if (matrixIsFinite(m)) {
			ctx.m = m;
			if (updateLineScale) {
				ctx.lineScale = Math.sqrt(Math.abs(m[0][0] * m[1][1] - m[0][1] * m[1][0]));
			}
		}
	};
	
	//////////////////////////////////
	//
	// CanvasGradient
	//
	//////////////////////////////////////////////////////////////////////////////////
	var CanvasGradient = function(type) {
		this.type = type;
		this.colors = [];
		this.x0 = 0;
		this.y0 = 0;
		this.r0 = 0;
		this.x1 = 0;
		this.y1 = 0;
		this.r1 = 0;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	CanvasGradient.prototype.addColorStop = function(offset, color) {
		color = getColorData(color);
		this.colors.push({ offset : offset, color : color.color, alpha : color.alpha });
	};
	
	//////////////////////////////////
	//
	// CanvasPattern
	//
	//////////////////////////////////////////////////////////////////////////////////
	var CanvasPattern = function(image, repetition) {
		if (!image || image.nodeType !== 1 || image.tagName !== "IMG") {
			throw new DOMException("TYPE_MISMATCH_ERR");
		}
		if (image.readyState !== "complete") {
			throw new DOMException("INVALID_STATE_ERR");
		}
		
		this.src = image.src;
		this.width = image.width;
		this.height = image.height;
		switch (repetition) {
			case null:
			case "":
			case "repeat":
				this.repetition = "repeat";
				break;
			case "repeat-x":
			case "repeat-y":
			case "no-repeat":
				this.repetition = repetition;
				break;
			default:
				throw new DOMException("SYNTAX_ERR");
		}
	};
	
	//////////////////////////////////
	//
	// DOMException
	//
	//////////////////////////////////////////////////////////////////////////////////
	var DOMExceptionProto;
	var DOMException = function(type) {
		this.code = this[type];
		this.message = type + ": DOM Exception " + this.code;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	(DOMExceptionProto = (DOMException.prototype = new Error)).INDEX_SIZE_ERR = 1;
	DOMExceptionProto.DOMSTRING_SIZE_ERR = 2;
	DOMExceptionProto.HIERARCHY_REQUEST_ERR = 3;
	DOMExceptionProto.WRONG_DOCUMENT_ERR = 4;
	DOMExceptionProto.INVALID_CHARACTER_ERR = 5;
	DOMExceptionProto.NO_DATA_ALLOWED_ERR = 6;
	DOMExceptionProto.NO_MODIFICATION_ALLOWED_ERR = 7;
	DOMExceptionProto.NOT_FOUND_ERR = 8;
	DOMExceptionProto.NOT_SUPPORTED_ERR = 9;
	DOMExceptionProto.INUSE_ATTRIBUTE_ERR = 10;
	DOMExceptionProto.INVALID_STATE_ERR = 11;
	DOMExceptionProto.SYNTAX_ERR = 12;
	DOMExceptionProto.INVALID_MODIFICATION_ERR = 13;
	DOMExceptionProto.NAMESPACE_ERR = 14;
	DOMExceptionProto.INVALID_ACCESS_ERR = 15;
	DOMExceptionProto.VALIDATION_ERR = 16;
	DOMExceptionProto.TYPE_MISMATCH_ERR = 17;
	
	//////////////////////////////////
	//
	// Utility Functions
	//
	//////////////////////////////////////////////////////////////////////////////////
	var bind = function(func, that) {
		var a = slice.call(arguments, 2);
		return function() { return func.apply(that, a.concat(slice.call(arguments))); };
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var getCoords = function(m, x, y) {
		return {
			x : 10 * (x * m[0][0] + y * m[1][0] + m[2][0]) - 5, 
			y : 10 * (x * m[0][1] + y * m[1][1] + m[2][1]) - 5
		};
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var matrixMultiply = function(m1, m2) {
		var result = createMatrixIdentity(), 
		    x, y;
		
		for (x=0; x<3; x++) {
			for (y=0; y<3; y++) {
				result[x][y] = (m1[x][0] * m2[0][y]) + (m1[x][1] * m2[1][y]) + (m1[x][2] * m2[2][y]);
			}
		}
		return result;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var matrixIsFinite = function(m) {
		return isFinite(m[0][0]) && isFinite(m[0][1]) && isFinite(m[1][0]) && 
		       isFinite(m[2][0]) && isFinite(m[1][1]) && isFinite(m[2][1]);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var getColorData = function(color) {
		var alpha, hex, values;
		
		if (colorCache[(color = "" + color)]) {
			return colorCache[color];
		} else if (color.indexOf("#") === 0) {
			hex = color;
		} else if (color.indexOf("rgb") === 0) {
			values = getRgbOrHslColorValues(color);
			alpha = parseFloat(values[3]);
			hex = rgbToHex(values);
		} else if (color.indexOf("hsl") === 0) {
			values = getRgbOrHslColorValues(color);
			alpha = parseFloat(values[3]);
			hex = hslToHex(values);
		} else {
			hex = strColors[color] || color;
		}
		
		return (colorCache[color] = { color : hex, alpha : (alpha !== undefined) ? alpha : 1 });
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var getRgbOrHslColorValues = function(color) {
		var s = color.indexOf("(", 3), 
		    e = color.indexOf(")", s + 1), 
		    p = color.substring(s + 1, e).split(",");
		
		p[3] = (p.length !== 4 || color.charAt(3) !== "a") ? "1" : p[3];
		return p;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var rgbToHex = function(rgb) {
		var hex = "#", value, v;
		
		for (v=0; v<3; v++) {
			if ((value = rgb[v]).indexOf("%") !== -1) {
				value = floor((parseFloat(value) / 100) * 255).toString(16);
			} else {
				value = mMin(mMax(parseInt(value, 10), 0), 255).toString(16);
			}
			hex += ((value.length === 1) ? "0" + value : value);
		}
		return hex;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var hslToHex = function(hsl) {
		var rgb, h, s, l, q, p, v;
		
		h = ((h = parseFloat(hsl[0]) / 360 % 360) < 0) ? h + 1 : h;
		s = mMin(mMax(parseFloat(hsl[1]) / 100, 0), 1);
		l = mMin(mMax(parseFloat(hsl[2]) / 100, 0), 1);
		
		if (!s) {
			rgb = [1, 1, 1]; // achromatic
		} else {
			q = (l < 0.5) ? l * (s + 1) : l + s - l * s;
			p = 2 * l - q;
			rgb = [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
		}
		
		for (v=0; v<3; v++) {
			rgb[v] = ((rgb[v] = floor(rgb[v] * 255).toString(16)).length === 1) ? "0" + rgb[v] : rgb[v];
		}
		return "#" + rgb.join("");
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var hueToRgb = function(m1, m2, h) {
		h = (h < 0) ? h + 1 : (h > 1) ? h - 1 : h;
		
		if (h * 6 < 1) {
			return m1 + (m2 - m1) * 6 * h;
		} else if (h * 2 < 1) {
			return m2;
		} else if (h * 3 < 2) {
			return m1 + (m2 - m1) * (2 / 3 - h) * 6;
		} else {
			return m1;
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var strColors = {
	    	aliceblue : "#F0F8FF", 
	    	antiquewhite : "#FAEBD7", 
	    	aquamarine : "#7FFFD4", 
	    	azure : "#F0FFFF", 
	    	beige : "#F5F5DC", 
	    	bisque : "#FFE4C4", 
	    	black : "#000000", 
	    	blanchedalmond : "#FFEBCD", 
	    	blueviolet : "#8A2BE2", 
	    	brown : "#A52A2A", 
	    	burlywood : "#DEB887", 
	    	cadetblue : "#5F9EA0", 
	    	chartreuse : "#7FFF00", 
	    	chocolate : "#D2691E", 
	    	coral : "#FF7F50", 
	    	cornflowerblue : "#6495ED", 
	    	cornsilk : "#FFF8DC", 
	    	crimson : "#DC143C", 
	    	cyan : "#00FFFF", 
	    	darkblue : "#00008B", 
	    	darkcyan : "#008B8B", 
	    	darkgoldenrod : "#B8860B", 
	    	darkgray : "#A9A9A9", 
	    	darkgreen : "#006400", 
	    	darkgrey : "#A9A9A9", 
	    	darkkhaki : "#BDB76B", 
	    	darkmagenta : "#8B008B", 
	    	darkolivegreen : "#556B2F", 
	    	darkorange : "#FF8C00", 
	    	darkorchid : "#9932CC", 
	    	darkred : "#8B0000", 
	    	darksalmon : "#E9967A", 
	    	darkseagreen : "#8FBC8F", 
	    	darkslateblue : "#483D8B", 
	    	darkslategray : "#2F4F4F", 
	    	darkslategrey : "#2F4F4F", 
	    	darkturquoise : "#00CED1", 
	    	darkviolet : "#9400D3", 
	    	deeppink : "#FF1493", 
	    	deepskyblue : "#00BFFF", 
	    	dimgray : "#696969", 
	    	dimgrey : "#696969", 
	    	dodgerblue : "#1E90FF", 
	    	firebrick : "#B22222", 
	    	floralwhite : "#FFFAF0", 
	    	forestgreen : "#228B22", 
	    	gainsboro : "#DCDCDC", 
	    	ghostwhite : "#F8F8FF", 
	    	gold : "#FFD700", 
	    	goldenrod : "#DAA520", 
	    	grey : "#808080", 
	    	greenyellow : "#ADFF2F", 
	    	honeydew : "#F0FFF0", 
	    	hotpink : "#FF69B4", 
	    	indianred : "#CD5C5C", 
	    	indigo : "#4B0082", 
	    	ivory : "#FFFFF0", 
	    	khaki : "#F0E68C", 
	    	lavender : "#E6E6FA", 
	    	lavenderblush : "#FFF0F5", 
	    	lawngreen : "#7CFC00", 
	    	lemonchiffon : "#FFFACD", 
	    	lightblue : "#ADD8E6", 
	    	lightcoral : "#F08080", 
	    	lightcyan : "#E0FFFF", 
	    	lightgoldenrodyellow : "#FAFAD2", 
	    	lightgreen : "#90EE90", 
	    	lightgrey : "#D3D3D3", 
	    	lightpink : "#FFB6C1", 
	    	lightsalmon : "#FFA07A", 
	    	lightseagreen : "#20B2AA", 
	    	lightskyblue : "#87CEFA", 
	    	lightslategray : "#778899", 
	    	lightslategrey : "#778899", 
	    	lightsteelblue : "#B0C4DE", 
	    	lightyellow : "#FFFFE0", 
	    	limegreen : "#32CD32", 
	    	linen : "#FAF0E6", 
	    	magenta : "#FF00FF", 
	    	mediumaquamarine : "#66CDAA", 
	    	mediumblue : "#0000CD", 
	    	mediumorchid : "#BA55D3", 
	    	mediumpurple : "#9370DB", 
	    	mediumseagreen : "#3CB371", 
	    	mediumslateblue : "#7B68EE", 
	    	mediumspringgreen : "#00FA9A", 
	    	mediumturquoise : "#48D1CC", 
	    	mediumvioletred : "#C71585", 
	    	midnightblue : "#191970", 
	    	mintcream : "#F5FFFA", 
	    	mistyrose : "#FFE4E1", 
	    	moccasin : "#FFE4B5", 
	    	navajowhite : "#FFDEAD", 
	    	oldlace : "#FDF5E6", 
	    	olivedrab : "#6B8E23", 
	    	orange : "#FFA500", 
	    	orangered : "#FF4500", 
	    	orchid : "#DA70D6", 
	    	palegoldenrod : "#EEE8AA", 
	    	palegreen : "#98FB98", 
	    	paleturquoise : "#AFEEEE", 
	    	palevioletred : "#DB7093", 
	    	papayawhip : "#FFEFD5", 
	    	peachpuff : "#FFDAB9", 
	    	peru : "#CD853F", 
	    	pink : "#FFC0CB", 
	    	plum : "#DDA0DD", 
	    	powderblue : "#B0E0E6", 
	    	rosybrown : "#BC8F8F", 
	    	royalblue : "#4169E1", 
	    	saddlebrown : "#8B4513", 
	    	salmon : "#FA8072", 
	    	sandybrown : "#F4A460", 
	    	seagreen : "#2E8B57", 
	    	seashell : "#FFF5EE", 
	    	sienna : "#A0522D", 
	    	skyblue : "#87CEEB", 
	    	slateblue : "#6A5ACD", 
	    	slategray : "#708090", 
	    	slategrey : "#708090", 
	    	snow : "#FFFAFA", 
	    	springgreen : "#00FF7F", 
	    	steelblue : "#4682B4", 
	    	tan : "#D2B48C", 
	    	thistle : "#D8BFD8", 
	    	tomato : "#FF6347", 
	    	turquoise : "#40E0D0", 
	    	violet : "#EE82EE", 
	    	wheat : "#F5DEB3", 
	    	whitesmoke : "#F5F5F5", 
	    	yellowgreen : "#9ACD32"
	    };
	
	//////////////////////////////////////////////////////////////////////////////////
	var getFontData = function(font, cSize) {
		var cacheKey = (font = "" + font) + "|" + cSize, 
		    styles, size, divStyle;
		
		// Check cache:
		if (fontCache[cacheKey]) {
			return fontCache[cacheKey];
		}
		
		// Set and get font styles:
		try { (divStyle = document.createElement("div").style).font = font; } catch (e) {}
		styles = {
			style : divStyle.fontStyle || "normal", 
			variant : divStyle.fontVariant || "normal", 
			weight : divStyle.fontWeight || "normal", 
			family : divStyle.fontFamily || "sans-serif", 
			size : divStyle.fontSize || 10
		};
		
		// Get the scaled font size:
		if (typeof((size = styles.size)) !== "number") {
			size = parseFloat(size);
			cSize = parseFloat(cSize);
			styles.size = (styles.size.indexOf("px") !== -1) ? size : 
			              (styles.size.indexOf("em") !== -1) ? cSize * size : 
			              (styles.size.indexOf("%") !== -1) ? (cSize / 100) * size : 
			              (styles.size.indexOf("pt") !== -1) ? size / 0.75 : cSize;
		}
		styles.size = styles.size * 0.981; // Different scaling between normal text and VML text
		return (fontCache[cacheKey] = styles);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var createMatrixIdentity = function() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }, 
	    slice = Array.prototype.slice, 
	    push = Array.prototype.push, 
	    floor = Math.floor, 
	    round = Math.round, 
	    mMin = Math.min, 
	    mMax = Math.max, 
	    colorCache = {}, 
	    fontCache = {}, 
	    cos = Math.cos, 
	    sin = Math.sin;
	
	// Initialize and expose:
	G_vmlCanvasManager.init();
	window.G_vmlCanvasManager = G_vmlCanvasManager;
	window.CanvasRenderingContext2D = CanvasRenderingContext2D;
	window.CanvasGradient = CanvasGradient;
	window.CanvasPattern = CanvasPattern;
	window.DOMException = DOMException;
	
})(this, this.document);

