// src/pages/ErrorPage401.jsx
import * as React from "react";
import error401 from "~/assets/errors/401_new.png";
import { useNavigate } from "react-router-dom";

export default function ErrorPage401() {
  const navigate = useNavigate();
  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '90vh' }}>
      <div className="container text-center">
        <div className="display-1 fw-bold">401</div>
        <div className="h4 fw-bold mt-2">ERROR - Unauthorized Page</div>
        <div className="d-flex justify-content-center my-3">
          <img src={error401} alt="401 illustration" style={{ width: '80%', maxWidth: 420 }} />
        </div>
        <button className="btn btn-link fw-bold" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-2" />Về Trang trước
        </button>
      </div>
    </div>
  );
}
