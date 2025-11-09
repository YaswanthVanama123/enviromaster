import React, { useState } from "react";
import "./CustomerSection.css";
import logo from "../assets/em-logo.png"; // 👈 put your logo inside src/assets/

export default function CustomerSection() {
  const [v, setV] = useState({
    customerName: "",
    customerNumber: "",
    customerContact: "",
    pocEmail: "",
    pocPhone: "",
  });

  const onChange = (e) => setV({ ...v, [e.target.name]: e.target.value });

  return (
    <section className="cua2">
      {/* LEFT: logo image */}
      <div className="cua2__logo">
        <img src={logo} alt="Enviro-Master Logo" className="cua2__logo-img" />
      </div>

      {/* RIGHT: heading + fields */}
      <div className="cua2__right">
        <h1 className="cua2__title">Customer Update Addendum</h1>

        <div className="cua2__fields">
          {/* Row 1 */}
          <div className="cua2__field">
            <label>CUSTOMER NAME :</label>
            <input
              name="customerName"
              value={v.customerName}
              onChange={onChange}
            />
          </div>

          <div className="cua2__field">
            <label>CUSTOMER CONTACT :</label>
            <input
              name="customerContact"
              value={v.customerContact}
              onChange={onChange}
            />
          </div>

          {/* Row 2 */}
          <div className="cua2__field">
            <label>CUSTOMER NUMBER :</label>
            <input
              name="customerNumber"
              value={v.customerNumber}
              onChange={onChange}
            />
          </div>

          <div className="cua2__field">
            <label>POC EMAIL :</label>
            <input
              type="email"
              name="pocEmail"
              value={v.pocEmail}
              onChange={onChange}
            />
          </div>

          {/* Row 3 */}
          <div className="cua2__field cua2__field--span1">
            <label>POC PHONE :</label>
            <input
              type="tel"
              name="pocPhone"
              value={v.pocPhone}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
