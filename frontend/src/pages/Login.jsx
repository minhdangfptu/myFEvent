import { Link as RouterLink } from "react-router-dom"

const mockAccounts = [
  { name: "Sarah Johnson", email: "sarah.johnson@fpt.edu.vn", avatar: "https://placeholder.svg?height=40&width=40&query=person+avatar+1" },
  { name: "Michael Chen", email: "michael.chen@fpt.edu.vn", avatar: "https://placeholder.svg?height=40&width=40&query=person+avatar+2" },
  { name: "David Rodriguez", email: "david.rodriguez@fpt.edu.vn", avatar: "https://placeholder.svg?height=40&width=40&query=person+avatar+3" }
]

export default function LoginPage() {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ height: '100dvh', backgroundColor: '#f8f9fa' }}>
      <div className="card shadow-sm border-0" style={{ width: '100%', maxWidth: 450, borderRadius: 16 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <div className="d-flex justify-content-center mb-2">
              <div className="rounded-circle bg-white d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="bi bi-google" style={{ color: '#4285f4', fontSize: 24 }}></i>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 16, marginBottom: 4 }}>Google</div>
            <div className="fs-4" style={{ color: '#202124' }}>Choose an</div>
            <div className="fs-4" style={{ color: '#202124' }}><span className="fw-semibold">account</span></div>
            <div className="text-muted mt-2" style={{ fontSize: 14 }}>to continue to <span className="fw-semibold">myFEvent</span></div>
          </div>

          <div className="mb-2">
            {mockAccounts.map((account, index) => (
              <button key={index} className="btn btn-light w-100 text-start mb-2 d-flex align-items-center" style={{ padding: '10px 12px', border: '1px solid #dadce0' }}>
                <img src={account.avatar} alt={account.name} className="me-2 rounded-circle" style={{ width: 36, height: 36 }} />
                <div className="text-start flex-grow-1">
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#3c4043' }}>{account.name}</div>
                  <div className="text-muted" style={{ fontSize: 13 }}>{account.email}</div>
                </div>
              </button>
            ))}
          </div>

          <button className="btn w-100 text-start" style={{ color: '#1a73e8' }}>
            <i className="bi bi-person-plus me-2" />Use another account
          </button>

          <hr className="my-3" />

          <div className="text-center text-muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
            To continue, Google will share your name, email address, and profile picture with myFEvent. See myFEvent's <a href="#" className="text-decoration-none" style={{ color: '#1a73e8' }}>Privacy Policy</a> and <a href="#" className="text-decoration-none" style={{ color: '#1a73e8' }}>Terms of Service</a>.
          </div>
        </div>
      </div>
    </div>
  )
}


