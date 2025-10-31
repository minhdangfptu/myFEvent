// src/pages/ErrorPage404.jsx
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import error404 from "~/assets/errors/404.png";

export default function ErrorPage404() {
  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '90vh' }}>
      <div className="container text-center">
        <div className="display-1 fw-bold">404</div>
        <div className="h4 fw-bold mt-2">OOPS, Bạn đi lạc rồi!</div>
        <div className="d-flex justify-content-center my-3">
          <img src={error404} alt="404 illustration" style={{ width: '80%', maxWidth: 420 }} />
        </div>
        <RouterLink to="/home-page" className="btn btn-link fw-bold">
          <i className="bi bi-arrow-left me-2" />Về Trang Chủ
        </RouterLink>
      </div>
    </div>
  );
}
