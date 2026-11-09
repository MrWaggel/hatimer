function t(t,e,i,s){var r,n=arguments.length,o=n<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(o=(n<3?r(o):n>3?r(e,i,o):r(e,i))||o);return n>3&&o&&Object.defineProperty(e,i,o),o}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),r=new WeakMap;let n=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&r.set(e,t))}return t}toString(){return this.cssText}};const o=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:a,defineProperty:h,getOwnPropertyDescriptor:l,getOwnPropertyNames:c,getOwnPropertySymbols:d,getPrototypeOf:u}=Object,p=globalThis,_=p.trustedTypes,m=_?_.emptyScript:"",f=p.reactiveElementPolyfillSupport,g=(t,e)=>t,$={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},y=(t,e)=>!a(t,e),v={attribute:!0,type:String,converter:$,reflect:!1,useDefault:!1,hasChanged:y};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),p.litPropertyMetadata??=new WeakMap;let b=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=v){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&h(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:r}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const n=s?.call(this);r?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??v}static _$Ei(){if(this.hasOwnProperty(g("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(g("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(g("properties"))){const t=this.properties,e=[...c(t),...d(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(o(t))}else void 0!==t&&e.push(o(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),r=e.litNonce;void 0!==r&&s.setAttribute("nonce",r),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:$).toAttribute(e,i.type);this._$Em=t,null==r?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:$;this._$Em=s;const n=r.fromAttribute(e,t.type);this[s]=n??this._$Ej?.get(s)??n,this._$Em=null}}requestUpdate(t,e,i,s=!1,r){if(void 0!==t){const n=this.constructor;if(!1===s&&(r=this[t]),i??=n.getPropertyOptions(t),!((i.hasChanged??y)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:r},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==r||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};b.elementStyles=[],b.shadowRootOptions={mode:"open"},b[g("elementProperties")]=new Map,b[g("finalized")]=new Map,f?.({ReactiveElement:b}),(p.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const A=globalThis,S=t=>t,w=A.trustedTypes,E=w?w.createPolicy("lit-html",{createHTML:t=>t}):void 0,x="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,T="?"+C,P=`<${T}>`,z=document,k=()=>z.createComment(""),U=t=>null===t||"object"!=typeof t&&"function"!=typeof t,O=Array.isArray,M="[ \t\n\f\r]",N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,H=/>/g,I=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),D=/'/g,j=/"/g,B=/^(?:script|style|textarea|title)$/i,L=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),q=Symbol.for("lit-noChange"),F=Symbol.for("lit-nothing"),V=new WeakMap,W=z.createTreeWalker(z,129);function Z(t,e){if(!O(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(e):e}const J=(t,e)=>{const i=t.length-1,s=[];let r,n=2===e?"<svg>":3===e?"<math>":"",o=N;for(let e=0;e<i;e++){const i=t[e];let a,h,l=-1,c=0;for(;c<i.length&&(o.lastIndex=c,h=o.exec(i),null!==h);)c=o.lastIndex,o===N?"!--"===h[1]?o=R:void 0!==h[1]?o=H:void 0!==h[2]?(B.test(h[2])&&(r=RegExp("</"+h[2],"g")),o=I):void 0!==h[3]&&(o=I):o===I?">"===h[0]?(o=r??N,l=-1):void 0===h[1]?l=-2:(l=o.lastIndex-h[2].length,a=h[1],o=void 0===h[3]?I:'"'===h[3]?j:D):o===j||o===D?o=I:o===R||o===H?o=N:(o=I,r=void 0);const d=o===I&&t[e+1].startsWith("/>")?" ":"";n+=o===N?i+P:l>=0?(s.push(a),i.slice(0,l)+x+i.slice(l)+C+d):i+C+(-2===l?e:d)}return[Z(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class K{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let r=0,n=0;const o=t.length-1,a=this.parts,[h,l]=J(t,e);if(this.el=K.createElement(h,i),W.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=W.nextNode())&&a.length<o;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(x)){const e=l[n++],i=s.getAttribute(t).split(C),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:o[2],strings:i,ctor:"."===o[1]?tt:"?"===o[1]?et:"@"===o[1]?it:Y}),s.removeAttribute(t)}else t.startsWith(C)&&(a.push({type:6,index:r}),s.removeAttribute(t));if(B.test(s.tagName)){const t=s.textContent.split(C),e=t.length-1;if(e>0){s.textContent=w?w.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],k()),W.nextNode(),a.push({type:2,index:++r});s.append(t[e],k())}}}else if(8===s.nodeType)if(s.data===T)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=s.data.indexOf(C,t+1));)a.push({type:7,index:r}),t+=C.length-1}r++}}static createElement(t,e){const i=z.createElement("template");return i.innerHTML=t,i}}function G(t,e,i=t,s){if(e===q)return e;let r=void 0!==s?i._$Co?.[s]:i._$Cl;const n=U(e)?void 0:e._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),void 0===n?r=void 0:(r=new n(t),r._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=r:i._$Cl=r),void 0!==r&&(e=G(t,r._$AS(t,e.values),r,s)),e}class Q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??z).importNode(e,!0);W.currentNode=s;let r=W.nextNode(),n=0,o=0,a=i[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new X(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new st(r,this,t)),this._$AV.push(e),a=i[++o]}n!==a?.index&&(r=W.nextNode(),n++)}return W.currentNode=z,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=F,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=G(this,t,e),U(t)?t===F||null==t||""===t?(this._$AH!==F&&this._$AR(),this._$AH=F):t!==this._$AH&&t!==q&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>O(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==F&&U(this._$AH)?this._$AA.nextSibling.data=t:this.T(z.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=K.createElement(Z(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new Q(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new K(t)),e}k(t){O(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const r of t)s===e.length?e.push(i=new X(this.O(k()),this.O(k()),this,this.options)):i=e[s],i._$AI(r),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=S(t).nextSibling;S(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class Y{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,r){this.type=1,this._$AH=F,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=F}_$AI(t,e=this,i,s){const r=this.strings;let n=!1;if(void 0===r)t=G(this,t,e,0),n=!U(t)||t!==this._$AH&&t!==q,n&&(this._$AH=t);else{const s=t;let o,a;for(t=r[0],o=0;o<r.length-1;o++)a=G(this,s[i+o],e,o),a===q&&(a=this._$AH[o]),n||=!U(a)||a!==this._$AH[o],a===F?t=F:t!==F&&(t+=(a??"")+r[o+1]),this._$AH[o]=a}n&&!s&&this.j(t)}j(t){t===F?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class tt extends Y{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===F?void 0:t}}class et extends Y{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==F)}}class it extends Y{constructor(t,e,i,s,r){super(t,e,i,s,r),this.type=5}_$AI(t,e=this){if((t=G(this,t,e,0)??F)===q)return;const i=this._$AH,s=t===F&&i!==F||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==F&&(i===F||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){G(this,t)}}const rt=A.litHtmlPolyfillSupport;rt?.(K,X),(A.litHtmlVersions??=[]).push("3.3.3");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends b{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const s=i?.renderBefore??e;let r=s._$litPart$;if(void 0===r){const t=i?.renderBefore??null;s._$litPart$=r=new X(e.insertBefore(k(),t),t,void 0,i??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return q}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const at=nt.litElementPolyfillSupport;at?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ht=t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},lt={attribute:!0,type:String,converter:$,reflect:!1,hasChanged:y},ct=(t=lt,e,i)=>{const{kind:s,metadata:r}=i;let n=globalThis.litPropertyMetadata.get(r);if(void 0===n&&globalThis.litPropertyMetadata.set(r,n=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const r=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,r,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const r=this[s];e.call(this,i),this.requestUpdate(s,r,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function dt(t){return(e,i)=>"object"==typeof i?ct(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ut(t){return dt({...t,state:!0,attribute:!1})}const pt=["/local/smart_timer/kitchen-timer.mp3","/smart_timer/kitchen-timer.mp3"];function _t(t){const e=Math.max(0,Math.floor(t)),i=Math.floor(e/3600),s=Math.floor(e%3600/60),r=e%60;return`${String(i).padStart(2,"0")}:${String(s).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function mt(t){return t>=3?"reset":1===t?"toggle":"ignore"}let ft=class extends ot{constructor(){super(...arguments),this._config={entity:""}}setConfig(t){this._config={show_buttons:!0,show_pause_reset:!0,title_size:1,clock_size:1.6,button_size:.8,button_padding:8,...t}}_valueChanged(t){const e=t.detail.value;this._config=e,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}_label(t){return{entity:"Smart Timer",name:"Name",show_buttons:"Show + time buttons",show_pause_reset:"Show PAUSE / RESET button",title_size:"Title size",clock_size:"Timer text size",button_size:"Button text size",button_padding:"Button size"}[t.name]||t.name}render(){if(!this.hass)return L``;return L`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${[{name:"entity",required:!0,selector:{entity:{integration:"smart_timer"}}},{name:"name",selector:{text:{}}},{name:"show_buttons",selector:{boolean:{}}},{name:"show_pause_reset",selector:{boolean:{}}},{name:"title_size",selector:{number:{min:.7,max:2.5,step:.1,mode:"box",unit_of_measurement:"rem"}}},{name:"clock_size",selector:{number:{min:1,max:5,step:.1,mode:"box",unit_of_measurement:"rem"}}},{name:"button_size",selector:{number:{min:.6,max:1.6,step:.05,mode:"box",unit_of_measurement:"rem"}}},{name:"button_padding",selector:{number:{min:2,max:24,step:1,mode:"box",unit_of_measurement:"px"}}}]}
        .computeLabel=${this._label}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}};t([dt({attribute:!1})],ft.prototype,"hass",void 0),t([ut()],ft.prototype,"_config",void 0),ft=t([ht("smart-timer-card-editor")],ft);let gt=class extends ot{constructor(){super(...arguments),this._display="00:00:00",this._timerState="idle",this._alerting=!1,this._taps=[],this._alertDone=!1,this._onScreen=!1,this._pendingAlarm=!1,this._seenRunning=!1,this._firedThisZero=!1}static getConfigElement(){return document.createElement("smart-timer-card-editor")}static getStubConfig(){return{entity:"",show_buttons:!0,show_pause_reset:!0,title_size:1,clock_size:1.6,button_size:.8,button_padding:8}}setConfig(t){if(!t||"object"!=typeof t)throw new Error("Invalid card configuration");this.config={show_buttons:!0,show_pause_reset:!0,title_size:1,clock_size:1.6,button_size:.8,button_padding:8,name:"",...t}}getCardSize(){return 3}get _entityId(){return this.config?.entity||""}get _entity(){return this._entityId?this.hass?.states?.[this._entityId]:void 0}willUpdate(t){(t.has("hass")||t.has("config"))&&this._updateFromEntity()}_updateFromEntity(){const t=this._entity;if(!t)return this._display="--:--:--",void(this._timerState="unavailable");const e=t.attributes||{},i=e.formatted,s=Number(e.remaining_seconds),r=String(e.state||"idle"),n="string"==typeof i&&/^\d{2,}:\d{2}:\d{2}$/.test(i)?i:_t(Number.isFinite(s)?s:0);this._display=n,this._timerState=r,this._maybeFire(r,s),this._syncAlert(r)}_maybeFire(t,e){if("finished"!==t)return("running"===t||Number.isFinite(e)&&e>0)&&(this._seenRunning=!0),void(this._firedThisZero=!1);this._seenRunning&&!this._firedThisZero&&this._entityId&&(this._firedThisZero=!0,this._callService("fire"),this._playAlarm())}_syncAlert(t){if("finished"!==t||!this._seenRunning)return this._alerting=!1,this._alertDone=!1,window.clearTimeout(this._alertTimer),void(this._alertTimer=void 0);this._alertDone||null!=this._alertTimer||(this._alerting=!0,this._alertTimer=window.setTimeout(()=>{this._alerting=!1,this._alertDone=!0,this._alertTimer=void 0},15e3))}connectedCallback(){super.connectedCallback(),this._observer=new IntersectionObserver(t=>{this._onScreen=t.some(t=>t.isIntersecting)}),this._observer.observe(this)}_cardIsVisible(){if("hidden"===document.visibilityState)return!1;if(this._onScreen)return!0;const t=this.getBoundingClientRect();return t.width>0&&t.height>0&&t.bottom>0&&t.top<window.innerHeight}_alarmUrls(){const t=this._entity?.attributes?.alarm_url;return null===t||!1===t||""===t?[]:"string"==typeof t&&t&&!pt.includes(t)?[t,...pt]:"none"===this._entity?.attributes?.sound?[]:pt}_alarmElement(){return this.renderRoot?.querySelector("audio")??null}_unlockAudio(){const t=this._alarmElement();if(!t)return;const e=this._alarmUrls()[0];if(e&&t.getAttribute("src")!==e&&(t.src=e),!t.src)return;const i=t.volume;t.volume=0,t.play().then(()=>{t.pause(),t.currentTime=0,t.volume=i||1,this._pendingAlarm&&(this._pendingAlarm=!1,this._playAlarm())}).catch(()=>{t.volume=i||1})}_playAlarm(){if(!this._cardIsVisible())return;const t=this._alarmUrls(),e=this._alarmElement();t.length&&e&&this._playFirst(e,t)}async _playFirst(t,e){for(const i of e){t.src=i,t.volume=1;try{t.currentTime=0}catch{}try{return await t.play(),void(this._pendingAlarm=!1)}catch{}}this._pendingAlarm=!0}async _callService(t,e={}){this.hass&&this._entityId&&await this.hass.callService("smart_timer",t,{entity_id:this._entityId,...e})}_onIncrement(t){this._callService("add_time",{seconds:t})}_stopAlarm(){const t=this._alarmElement();if(t){t.pause();try{t.currentTime=0}catch{}this._pendingAlarm=!1}}_onTimerTap(t){if(t.preventDefault(),t.stopPropagation(),"finished"===this._timerState)return this._stopAlarm(),this._taps=[],window.clearTimeout(this._tapTimer),void this._callService("reset");this._onPauseButton(t)}_onPauseButton(t){t.preventDefault(),t.stopPropagation(),this._unlockAudio();const e=Date.now();if(this._taps=[...this._taps,e].filter(t=>e-t<=800),window.clearTimeout(this._tapTimer),"reset"===mt(this._taps.length))return this._taps=[],void this._callService("reset");this._tapTimer=window.setTimeout(()=>{const t=mt(this._taps.length);this._taps=[],"toggle"===t&&this._callService("toggle")},350)}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._tapTimer),window.clearTimeout(this._alertTimer),this._observer?.disconnect(),this._alarmElement()?.pause()}_sizeStyle(){return[`--st-title-size:${Number(this.config?.title_size??1)}rem`,`--st-clock-size:${Number(this.config?.clock_size??1.6)}rem`,`--st-button-size:${Number(this.config?.button_size??.8)}rem`,`--st-button-pad:${Number(this.config?.button_padding??8)}px`].join(";")}_renderButtons(){const t=!1!==this.config?.show_buttons,e=!1!==this.config?.show_pause_reset;return t||e?L`
      <div class="buttons ${t?"":"pause-only"}">
        ${t?L`
              <button class="inc" @click=${()=>this._onIncrement(10)}>+10 SEC</button>
              <button class="inc" @click=${()=>this._onIncrement(60)}>+1 MIN</button>
              <button class="inc" @click=${()=>this._onIncrement(300)}>+5 MIN</button>
            `:""}
        ${e?L`
              <button class="pause" @click=${t=>this._onPauseButton(t)}>
                PAUSE / RESET
              </button>
            `:""}
      </div>
    `:L``}render(){if(!this._entityId)return L`
        <ha-card>
          <div class="card-content">
            <div class="title">Smart Timer</div>
            <div class="hint">Pick a Smart Timer entity in the card editor.</div>
          </div>
        </ha-card>
      `;const t=this.config.name||this._entity?.attributes?.friendly_name||"Smart Timer";return L`
      <ha-card>
        <div class="card-content" style=${this._sizeStyle()}>
          <div class="header">
            <span class="title">${t}</span>
            <span class="status ${this._timerState} ${this._alerting?"alert":""}">${this._timerState}</span>
          </div>
          <div
            class="clock ${"running"!==this._timerState||this._alerting?"":"running"} ${this._alerting?"alert":""}"
            role="button"
            tabindex="0"
            @click=${t=>this._onTimerTap(t)}
            @keydown=${t=>{"Enter"!==t.key&&" "!==t.key||this._onTimerTap(t)}}
          >
            ${this._display}
          </div>
          <audio playsinline preload="auto" src="/local/smart_timer/kitchen-timer.mp3"></audio>
          ${this._renderButtons()}
        </div>
      </ha-card>
    `}};gt.styles=((t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new n(i,t,s)})`
    ha-card {
      overflow: hidden;
    }
    .card-content {
      padding: 8px 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--primary-text-color);
    }
    .header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .title {
      font-size: var(--st-title-size, var(--ha-font-size-m, 1rem));
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--primary-text-color);
    }
    .clock {
      font-family: var(--ha-font-family-code, var(--code-font-family, ui-monospace, monospace));
      font-size: var(--st-clock-size, 1.6rem);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: 1.1;
      letter-spacing: 0.04em;
      text-align: center;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
      padding: 2px 0 4px;
      cursor: pointer;
    }
    .clock.running {
      color: var(--primary-color);
    }
    .clock.alert {
      color: var(--error-color);
      animation: smart-timer-flash 1s ease-in-out infinite;
    }
    @keyframes smart-timer-flash {
      50% {
        opacity: 0.35;
      }
    }
    audio {
      display: none;
    }
    .status {
      text-transform: uppercase;
      font-size: var(--ha-font-size-xs, 0.7rem);
      letter-spacing: 0.04em;
      color: var(--secondary-text-color);
    }
    .status.running {
      color: var(--primary-color);
    }
    .status.alert {
      color: var(--error-color);
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 0.85rem);
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    button {
      border: none;
      border-radius: var(--ha-card-border-radius, var(--mdc-shape-small, 4px));
      font-size: var(--st-button-size, var(--ha-font-size-s, 0.8rem));
      font-weight: var(--ha-font-weight-medium, 500);
      letter-spacing: 0.02em;
      cursor: pointer;
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
      padding: var(--st-button-pad, 8px) 4px;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    button:active {
      filter: brightness(0.92);
    }
    button.inc {
      color: var(--primary-color);
    }
    button.pause,
    .buttons.pause-only {
      grid-column: 1 / -1;
    }
    button.pause {
      grid-column: 1 / -1;
      color: var(--primary-text-color);
    }
  `,t([dt({attribute:!1})],gt.prototype,"hass",void 0),t([dt({attribute:!1})],gt.prototype,"config",void 0),t([ut()],gt.prototype,"_display",void 0),t([ut()],gt.prototype,"_timerState",void 0),t([ut()],gt.prototype,"_alerting",void 0),gt=t([ht("smart-timer-card")],gt),window.customCards=window.customCards||[],window.customCards.push({type:"smart-timer-card",name:"Smart Timer",description:"Countdown with +10s / +1m / +5m and triple-tap reset.",preview:!0,documentationURL:"https://github.com/MrWaggel/hatimer"});export{gt as SmartTimerCard,ft as SmartTimerCardEditor,_t as formatSecondsHMS,mt as resolvePauseGesture};
