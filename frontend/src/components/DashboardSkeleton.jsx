export default function DashboardSkeleton() {
  return (
    <div className="bg-light" style={{ minHeight: "100vh", padding: "24px" }}>
      <div className="container-fluid px-0" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header Skeleton */}
        <div className="mb-4">
          <div
            className="skeleton-box mb-2"
            style={{ width: "300px", height: "32px", borderRadius: "8px" }}
          />
          <div
            className="skeleton-box"
            style={{ width: "200px", height: "20px", borderRadius: "6px" }}
          />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="row g-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="skeleton-box rounded-3"
                      style={{ width: "56px", height: "56px" }}
                    />
                  </div>
                  <div
                    className="skeleton-box mb-2"
                    style={{ width: "80px", height: "36px", borderRadius: "8px" }}
                  />
                  <div
                    className="skeleton-box"
                    style={{ width: "120px", height: "14px", borderRadius: "6px" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Middle Section Skeleton */}
        <div className="row g-3 mb-4">
          {[1, 2].map((i) => (
            <div key={i} className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                  <div
                    className="skeleton-box mb-4"
                    style={{ width: "200px", height: "18px", borderRadius: "6px" }}
                  />
                  <div className="d-flex flex-column gap-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j}>
                        <div
                          className="skeleton-box mb-2"
                          style={{ width: "100%", height: "20px", borderRadius: "6px" }}
                        />
                        <div
                          className="skeleton-box"
                          style={{ width: "100%", height: "10px", borderRadius: "6px" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section Skeleton */}
        <div className="row g-3">
          {[1, 2].map((i) => (
            <div key={i} className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                  <div
                    className="skeleton-box mb-4"
                    style={{ width: "180px", height: "16px", borderRadius: "6px" }}
                  />
                  <div
                    className="skeleton-box"
                    style={{ width: "100%", height: "200px", borderRadius: "8px" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .skeleton-box {
          background: linear-gradient(
            90deg,
            #f0f0f0 0%,
            #e0e0e0 50%,
            #f0f0f0 100%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  )
}
