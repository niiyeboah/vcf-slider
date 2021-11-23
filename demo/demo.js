import '@vaadin/vaadin-lumo-styles';
import '@vaadin-component-factory/vcf-anchor-nav';
import 'api-viewer-element/lib/api-docs.js';
import 'api-viewer-element/lib/api-demo.js';
import '../dist/src/vcf-slider.js';

const show = () => document.querySelectorAll('.hidden').forEach(element => element.classList.remove('hidden'));

window.addEventListener('WebComponentsReady', () => {
  const anchorNav = document.querySelector('vcf-anchor-nav');
  const apiDemos = document.querySelectorAll('api-demo');
  const apiDocs = document.querySelector('api-docs');

  fetch('./custom-elements.json')
    .then(res => res.json())
    .then(data => {
      [apiDocs, ...apiDemos].forEach(elem => (elem.elements = data.tags));
      anchorNav._scrollToHash();
      show();
    });
});
