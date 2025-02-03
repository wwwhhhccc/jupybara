import { LabIcon } from "@jupyterlab/ui-components";
export const AIExecutingIcon = new LabIcon({
  name: "llm4eda:calling-ai",
  svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="200" height="200" style="shape-rendering: auto; display: block; background: rgb(255, 255, 255);" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g>
    <g transform="rotate(0 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.9166666666666666s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(30 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.8333333333333334s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(60 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.75s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(90 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.6666666666666666s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(120 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.5833333333333334s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(150 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.5s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(180 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.4166666666666667s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(210 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.3333333333333333s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(240 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.25s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(270 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.16666666666666666s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(300 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="-0.08333333333333333s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
    <g transform="rotate(330 50 50)">
      <rect fill="#637cb5" height="24" width="12" ry="6" rx="3" y="14" x="44">
        <animate repeatCount="indefinite" begin="0s" dur="1s" keyTimes="0;1" values="1;0" attributeName="opacity"></animate>
      </rect>
    </g>
  </g>
</svg>`,
});

export const callAIIcon = new LabIcon({
  name: "llm4eda:call-ai",
  svgstr: `
  <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 15C8.44771 15 8 15.4477 8 16C8 16.5523 8.44771 17 9 17C9.55229 17 10 16.5523 10 16C10 15.4477 9.55229 15 9 15Z" fill="#0F0F0F"/>
    <path d="M14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16Z" fill="#0F0F0F"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 1C10.8954 1 10 1.89543 10 3C10 3.74028 10.4022 4.38663 11 4.73244V7H6C4.34315 7 3 8.34315 3 10V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V10C21 8.34315 19.6569 7 18 7H13V4.73244C13.5978 4.38663 14 3.74028 14 3C14 1.89543 13.1046 1 12 1ZM5 10C5 9.44772 5.44772 9 6 9H7.38197L8.82918 11.8944C9.16796 12.572 9.86049 13 10.618 13H13.382C14.1395 13 14.832 12.572 15.1708 11.8944L16.618 9H18C18.5523 9 19 9.44772 19 10V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V10ZM13.382 11L14.382 9H9.61803L10.618 11H13.382Z" fill="#0F0F0F"/>
    <path d="M1 14C0.447715 14 0 14.4477 0 15V17C0 17.5523 0.447715 18 1 18C1.55228 18 2 17.5523 2 17V15C2 14.4477 1.55228 14 1 14Z" fill="#0F0F0F"/>
    <path d="M22 15C22 14.4477 22.4477 14 23 14C23.5523 14 24 14.4477 24 15V17C24 17.5523 23.5523 18 23 18C22.4477 18 22 17.5523 22 17V15Z" fill="#0F0F0F"/>
  </svg>`,
});
