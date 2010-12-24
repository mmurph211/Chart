// MooTools: the javascript framework.
// Load this file's selection again by visiting: http://mootools.net/more/b8f99eef8ffa0eaa355682ee7f6660c3 
// Or build this file again with packager using: packager build More/Class.Binds More/Color
/*
---
copyrights:
  - [MooTools](http://mootools.net)

licenses:
  - [MIT License](http://mootools.net/license.txt)
...
*/
MooTools.More={version:"1.3.0.1",build:"6dce99bed2792dffcbbbb4ddc15a1fb9a41994b5"};Class.Mutators.Binds=function(a){return a;};Class.Mutators.initialize=function(a){return function(){Array.from(this.Binds).each(function(b){var c=this[b];
if(c){this[b]=c.bind(this);}},this);return a.apply(this,arguments);};};(function(){var d=this.Color=new Type("Color",function(f,g){if(arguments.length>=3){g="rgb";
f=Array.slice(arguments,0,3);}else{if(typeof f=="string"){if(f.match(/rgb/)){f=f.rgbToHex().hexToRgb(true);}else{if(f.match(/hsb/)){f=f.hsbToRgb();}else{f=f.hexToRgb(true);
}}}}g=g||"rgb";switch(g){case"hsb":var e=f;f=f.hsbToRgb();f.hsb=e;break;case"hex":f=f.hexToRgb(true);break;}f.rgb=f.slice(0,3);f.hsb=f.hsb||f.rgbToHsb();
f.hex=f.rgbToHex();return Object.append(f,this);});d.implement({mix:function(){var e=Array.slice(arguments);var g=(typeOf(e.getLast())=="number")?e.pop():50;
var f=this.slice();e.each(function(h){h=new d(h);for(var j=0;j<3;j++){f[j]=Math.round((f[j]/100*(100-g))+(h[j]/100*g));}});return new d(f,"rgb");},invert:function(){return new d(this.map(function(e){return 255-e;
}));},setHue:function(e){return new d([e,this.hsb[1],this.hsb[2]],"hsb");},setSaturation:function(e){return new d([this.hsb[0],e,this.hsb[2]],"hsb");},setBrightness:function(e){return new d([this.hsb[0],this.hsb[1],e],"hsb");
}});var b=function(h,f,e){return new d([h,f,e],"rgb");};var a=function(g,f,e){return new d([g,f,e],"hsb");};var c=function(e){return new d(e,"hex");};Array.implement({rgbToHsb:function(){var f=this[0],g=this[1],n=this[2],k=0;
var m=Math.max(f,g,n),i=Math.min(f,g,n);var o=m-i;var l=m/255,j=(m!=0)?o/m:0;if(j!=0){var h=(m-f)/o;var e=(m-g)/o;var p=(m-n)/o;if(f==m){k=p-e;}else{if(g==m){k=2+h-p;
}else{k=4+e-h;}}k/=6;if(k<0){k++;}}return[Math.round(k*360),Math.round(j*100),Math.round(l*100)];},hsbToRgb:function(){var h=Math.round(this[2]/100*255);
if(this[1]==0){return[h,h,h];}else{var e=this[0]%360;var j=e%60;var k=Math.round((this[2]*(100-this[1]))/10000*255);var i=Math.round((this[2]*(6000-this[1]*j))/600000*255);
var g=Math.round((this[2]*(6000-this[1]*(60-j)))/600000*255);switch(Math.floor(e/60)){case 0:return[h,g,k];case 1:return[i,h,k];case 2:return[k,h,g];case 3:return[k,i,h];
case 4:return[g,k,h];case 5:return[h,k,i];}}return false;}});String.implement({rgbToHsb:function(){var e=this.match(/\d{1,3}/g);return(e)?e.rgbToHsb():null;
},hsbToRgb:function(){var e=this.match(/\d{1,3}/g);return(e)?e.hsbToRgb():null;}});})();