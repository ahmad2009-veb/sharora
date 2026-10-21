/**
 * First-visit intro (≤ 1.25 s): the logo is drawn with a line, a gold spark runs across
 * the letters, a 0→100 % counter ticks, then the curtain lifts. Pure CSS (see
 * globals.css → .preloader) so it animates before hydration; an inline script skips it
 * for returning visitors in the same session and for prefers-reduced-motion.
 * data-intro delays the CSS hero entrance past the curtain; it is cleared once that entrance
 * has finished so a later in-app visit to the home page starts without the wait.
 */
const INIT = `try{var d=document.documentElement;if(matchMedia('(prefers-reduced-motion: reduce)').matches||sessionStorage.getItem('sh-pl')){d.dataset.preloader='off'}else{d.dataset.preloader='on';d.dataset.intro='on';sessionStorage.setItem('sh-pl','1');setTimeout(function(){d.dataset.preloader='off'},1400);setTimeout(function(){delete d.dataset.intro},6000)}}catch(e){document.documentElement.dataset.preloader='off'}`;

export function Preloader() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INIT }} />
      <div className="preloader" aria-hidden>
        <div className="preloader__inner">
          <svg viewBox="0 0 320 150" className="preloader__logo" fill="none">
            <circle
              className="pl-draw"
              pathLength={1}
              cx="160"
              cy="30"
              r="13"
              stroke="#FFDEA4"
              strokeWidth="2"
            />
            <g className="pl-draw-group" stroke="#F6F3EE" strokeWidth="1.6" strokeLinejoin="round">
              <path className="pl-draw" pathLength={1} d="M118 88V44h18v44" />
              <path className="pl-draw" pathLength={1} d="M140 88V30h20v58" />
              <path className="pl-draw" pathLength={1} d="M164 88V38h18v50" />
              <path className="pl-draw" pathLength={1} d="M186 88V52h18v36" />
              <path className="pl-draw" pathLength={1} d="M108 92h104" stroke="#FFDEA4" />
            </g>
            <text x="160" y="132" textAnchor="middle" className="pl-text">
              ЗАРАФШОН
            </text>
            <circle className="pl-spark" cx="92" cy="122" r="3" fill="#FFE7B0" />
          </svg>
          <span className="pl-count" />
        </div>
      </div>
    </>
  );
}
