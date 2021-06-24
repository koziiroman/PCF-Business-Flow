import { IInputs, IOutputs } from "./generated/ManifestTypes";

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Stepper from './stepper';
import Nonlinear from './nonlinear';
import vertical from './vertical';


class GetSteps {
  flowType:    any;
  steps:       any[];
  refreshData: (value: any) => void;
}

export class StepperControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private _context: ComponentFramework.Context<IInputs>;
  private _notifyOutputChanged: () => void;
  private _container: HTMLDivElement;
  private _props: GetSteps;
  private _refreshData: EventListenerOrEventListenerObject;

  /**
   * Empty constructor.
   */
  constructor() {}

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='starndard', it will receive an empty div element within which it can render its content.
   */
  public async init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ) {
    // Add control initialization code
    this._context = context;
    this._notifyOutputChanged = notifyOutputChanged;
    this._refreshData = this.refreshData.bind(this);

    this._container = document.createElement('div');
    container.appendChild(this._container);

    this._props = new GetSteps();
    this._props.steps = [];
    await this.getSteps();
    if (!this._props.steps.length) {
      alert('Contact Your Administrator with Error: "FetchXML did not return Protocol Steps"');
      return;
    }

    //Linear Basic Bar , Linear Basic Dotted , Linear Basic Customized
    // Vertical , NonLinear
    this._props.flowType = (
      context.parameters.flowTypeProperty && context.parameters.flowTypeProperty.raw ?
        context.parameters.flowTypeProperty.raw
      : 'Linear Basic Bar'
    );

    this._props.refreshData = this._refreshData;

    ReactDOM.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          (
            this._props.flowType === 'Vertical' ?
              vertical
            : this._props.flowType === 'NonLinear' ?
              Nonlinear
            : Stepper
          ),
          this._props
        )
      ),
      this._container
    );
  }

  refreshData() {
    this._notifyOutputChanged();
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    // Stepper.handleNext();
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
   */
  public getOutputs(): IOutputs {
    return {};
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Add code to cleanup control if necessary
  }

  private async getSteps(): Promise<void> {

    const {
      entityProperty: { raw: entityPropertyName },
      attributeStepName: { raw: stepNamePropertyName },
      attributeStepDesc: { raw: stepDescPropertyName },
      attributeStepOrder: { raw: stepOrderPropertyName }
    } = this._context.parameters;

    let fetchXML: string = "";
    fetchXML += "<fetch mapping='logical'>";
    fetchXML += `<entity name='${entityPropertyName}'>`;
    fetchXML += `<attribute name='${stepNamePropertyName}' />`;
    fetchXML += `<attribute name='${stepDescPropertyName}' />`;
    fetchXML += `<attribute name='${stepOrderPropertyName}' />`;
    fetchXML += "</entity>";
    fetchXML += "</fetch>";

    let response: ComponentFramework.WebApi.RetrieveMultipleResponse;
    try {
      response = await this._context.webAPI.retrieveMultipleRecords(
        entityPropertyName,
        `?fetchXml= ${encodeURIComponent(fetchXML)}`
      );

      this._props.steps = response.entities
        .sort((a, b) => a[stepOrderPropertyName] - b[stepOrderPropertyName])
        .map(
          ({ [stepNamePropertyName]: name, [stepDescPropertyName]: desc }) => ({ name, desc })
        );
    } catch(errorResponse) {}
  }
}
