// Dynamically load fonts via JS so bundler resolves the asset path
import CoolveticaOt from '../assets/icons/fonts/CoolveticaRg.otf';

const css = `@font-face {
  font-family: 'Coolvetica';
  src: url('${CoolveticaOt}') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`;

const style = document.createElement('style');
style.setAttribute('data-generated-by', 'loadFonts.js');
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

export default true;
