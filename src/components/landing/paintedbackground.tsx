// "use client";

// import React from "react";

// export function PaintedBackground() {
//   return (
//     <div className="fixed inset-0 z-0 overflow-hidden bg-[#023436] pointer-events-none">
      
//       {/* The "Brush Strokes" 
//         These are elongated, rotated divs with heavy blurring to simulate 
//         broad, sweeping acrylic paint strokes across the dark teal background.
//       */}
//       <div 
//         className="absolute -left-[10%] top-[5%] h-[25%] w-[70%] -rotate-12 rounded-[100%] bg-[#034d4f] opacity-80 blur-[80px]" 
//         aria-hidden 
//       />
      
//       <div 
//         className="absolute -right-[15%] top-[35%] h-[30%] w-[60%] rotate-[35deg] rounded-[100%] bg-[#037971] opacity-50 blur-[100px]" 
//         aria-hidden 
//       />
      
//       <div 
//         className="absolute -bottom-[10%] left-[15%] h-[35%] w-[50%] -rotate-12 rounded-[100%] bg-[#049A8F] opacity-30 blur-[120px]" 
//         aria-hidden 
//       />

//       {/* The "Canvas" Texture 
//         This SVG generates mathematical noise. When blended over the soft gradients 
//         using mix-blend-overlay, it creates a subtle, grainy texture that makes 
//         the blur look like physical paint on a canvas rather than digital gradients.
//       */}
//       <svg 
//         className="absolute inset-0 h-full w-full opacity-[0.15] mix-blend-overlay"
//         xmlns="http://www.w3.org/2000/svg"
//       >
//         <filter id="canvasNoise">
//           <feTurbulence
//             type="fractalNoise"
//             baseFrequency="0.8"
//             numOctaves="3"
//             stitchTiles="stitch"
//           />
//         </filter>
//         <rect width="100%" height="100%" filter="url(#canvasNoise)" />
//       </svg>
      
//     </div>
//   );
// }