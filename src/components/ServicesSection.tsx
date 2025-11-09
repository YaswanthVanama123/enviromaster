import React from "react";
import "./ServicesSection.css";

const Under = ({ name, type = "text", className = "", ...rest }) => (
  <input className={`svc-in ${className}`} name={name} type={type} {...rest} />
);

const Dollar = ({ name }) => (
  <div className="svc-dollar">
    <span>$</span>
    <input className="svc-in-box" name={name} />
  </div>
);

export default function ServicesSection() {
  return (
    <section className="svc">
      <div className="svc-title">SERVICES</div>

      <div className="svc-grid">
        {/* RESTROOM & HYGIENE */}
        <div className="svc-card">
          <h3 className="svc-h">RESTROOM &amp; HYGIENE</h3>
          <div className="svc-row"><label>Restrooms</label><Under name="restrooms" /></div>
          <div className="svc-row"><label>Bowls</label><Under name="bowls" /></div>
          <div className="svc-row"><label>Urinals</label><Under name="urinals" /></div>
          <div className="svc-row"><label>Sinks</label><Under name="sinks" /></div>
          <div className="svc-row svc-row-charge">
            <label className="svc-red">Total Sani Charge</label>
            <Dollar name="saniCharge" />
          </div>
          <div className="svc-row"><label>Frequency</label><Under name="saniFrequency" /></div>
        </div>

        {/* FOAMING DRAIN */}
        <div className="svc-card">
          <h3 className="svc-h">FOAMING DRAIN</h3>
          <div className="svc-row"><label>Kitchen</label><Under name="fdKitchen" /></div>
          <div className="svc-row"><label>Restrooms</label><Under name="fdRestrooms" /></div>
          <div className="svc-row"><label>Bar Area</label><Under name="fdBarArea" /></div>
          <div className="svc-row"><label>Total Drains</label><Under name="fdTotal" className="svc-in-box" /></div>
          <div className="svc-row svc-row-charge">
            <label className="svc-red">Foaming Drain Charge</label>
            <Dollar name="fdCharge" />
          </div>
          <div className="svc-row"><label>Frequency</label><Under name="fdFrequency" /></div>
        </div>

        {/* SCRUB SERVICE */}
        <div className="svc-card">
          <h3 className="svc-h">SCRUB SERVICE</h3>
          <div className="svc-row"><label>No. of Rooms</label><Under name="scrRooms" className="svc-in-box" /></div>
          <div className="svc-row"><label>Square Footage</label><Under name="scrSqft" className="svc-in-box" /></div>
          <div className="svc-row"><label>Tiles (Small/Large)</label><Under name="scrTiles" /></div>
          <div className="svc-row svc-row-charge">
            <label className="svc-red">Sani-Scrub Charge</label>
            <Dollar name="scrCharge" />
          </div>
          <div className="svc-row"><label>Frequency</label><Under name="scrFrequency" /></div>
        </div>

        {/* HAND SANITIZER */}
        <div className="svc-card">
          <h3 className="svc-h">HAND SANITIZER</h3>
          <div className="svc-row"><label>No. of Sanitizers</label><Under name="hsCount" className="svc-in-box" /></div>
          <div className="svc-row svc-row-charge">
            <label className="svc-red">Sanitizer Charge</label>
            <Dollar name="hsCharge" />
          </div>
          <div className="svc-row"><label>Frequency</label><Under name="hsFrequency" /></div>
        </div>

        {/* MICROMAX FLOOR */}
        <div className="svc-card">
          <h3 className="svc-h">MICROMAX FLOOR</h3>
          <div className="svc-row">
            <label>No. of Rooms</label>
            <div className="svc-inline svc-inline--tight">
              <Under name="mmRooms" className="sm" />
              <span>@</span>
              <Under name="mmRate" className="sm" />
              <span>=</span>
              <Under name="mmTotal" className="sm" />
            </div>
          </div>
          <div className="svc-row"><label>MicroMax Frequency</label><Under name="mmFrequency" /></div>
        </div>

        {/* RPM WINDOW */}
        <div className="svc-card">
          <h3 className="svc-h">RPM WINDOW</h3>
          <div className="svc-row">
            <label>No. of Windows</label>
            <div className="svc-inline svc-inline--tight">
              <Under name="rpmWindows" className="sm" />
              <span>@</span>
              <Under name="rpmRate" className="sm" />
              <span>=</span>
              <Under name="rpmTotal" className="sm" />
            </div>
          </div>
          <div className="svc-row"><label>RPM Frequency</label><Under name="rpmFrequency" /></div>
        </div>

        {/* SANIPOD */}
        <div className="svc-card">
          <h3 className="svc-h">SANIPOD</h3>
          <div className="svc-row">
            <label>No. of Fem Bins</label>
            <div className="svc-inline svc-inline--tight">
              <Under name="spBins" className="sm" />
              <span>@</span>
              <Under name="spRate" className="sm" />
              <span>=</span>
              <Under name="spTotal" className="sm" />
            </div>
          </div>
          <div className="svc-row"><label>SaniPod Frequency</label><Under name="spFrequency" /></div>
        </div>

        {/* TRIP CHARGE */}
        <div className="svc-card">
          <h3 className="svc-h">TRIP CHARGE</h3>
          <div className="svc-row svc-row-charge">
            <label className="svc-red">Trip Charge</label>
            <Dollar name="tripCharge" />
          </div>
        </div>

      {/* REFRESH POWER SCRUB — EXACT PDF ROWS (text + blank on same line) */}
      <div className="svc-card svc-card--wide">
        <h3 className="svc-h">REFRESH POWER SCRUB</h3>

        <div className="rps-wrap">
          <table className="rps">
            <tbody>
              {/* Row 1: Amount labels with $ + underline to the right */}
              <tr>
                {["Dumpster $", "Patio $", "Walkway $", "FOH $", "BOH $", "Other $"].map((lbl) => (
                  <td key={lbl}>
                    <div className="rps-inline">
                      <span className="rps-label">{lbl}</span>
                      <input className="rps-line" type="text" />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 2: Freq label + underline to the right */}
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <td key={`freq-${i}`}>
                    <div className="rps-inline">
                      <span className="rps-label">Freq</span>
                      <input className="rps-line" type="text" />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>


        {/* SERVICE NOTES — two editable lines */}
        <div className="svc-card svc-card--wide">
          <h3 className="svc-h">SERVICE NOTES</h3>
          <div className="svc-notes">
            <input className="svc-line-input" type="text" />
            <input className="svc-line-input" type="text" />
          </div>
        </div>
      </div>
    </section>
  );
}
