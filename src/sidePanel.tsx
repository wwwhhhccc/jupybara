import React from "react";
import { ReactWidget } from "@jupyterlab/ui-components";
import { INotebookTracker } from "@jupyterlab/notebook";
import TabbedPanel from "./TabbedPanel";


class TabbedWidget extends ReactWidget {
  private _tracker: INotebookTracker;

  constructor(tracker: INotebookTracker) {
    super();
    this._tracker = tracker;
    this.addClass("jp-side-panel-widget");
  }

  render(): JSX.Element {
    return (
      <div style={{ height: "100%", overflow: "hidden" }}>
        <TabbedPanel tracker={this._tracker} />
      </div>
    );
  }
}

export { TabbedWidget };