import * as React from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

const clubs = [
  {
    name: 'FPTU Psychology Club',
    email: 'fptupsyclub@gmail.com',
    image: 'https://scontent-nrt1-2.xx.fbcdn.net/v/t39.30808-1/565380047_1175535384585747_6110663770872966699_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=101&ccb=1-7&_nc_sid=2d3e12&_nc_eui2=AeG4x8v4GxFeEuYqnxCdgTDm3XAAL9jQuXndcAAv2NC5eZ6rAPDSzdS0zV2p9krzQUj4-VA3hb2toeM48kEaMorx&_nc_ohc=KzyLrAnnNEUQ7kNvwHCIuPC&_nc_oc=AdkzITR50KeMzpu0PnnX5yQ_9lzhzYVBLaPVrkXNtUmc3L2iiF9kG36-AfzxPruspkI&_nc_zt=24&_nc_ht=scontent-nrt1-2.xx&_nc_gid=aAadfG4Z3mMwPNk5MoUu-A&oh=00_AfdgQC5OanpWsyusI1exwGrtKOc58kLZIXjOsPZBF7QLXg&oe=68FD3771',
    icon: 'bi-heart',
  },
  {
    name: 'FPT Board Game Club',
    email: 'fptuboardgameclub@gmail.com',
    image: 'https://scontent-nrt1-2.xx.fbcdn.net/v/t39.30808-6/483915105_624627633759130_7415295663701928565_n.jpg?stp=dst-jpg_p526x395_tt6&_nc_cat=102&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeEB4vXgkV5Cpyl0FysXFTlt-mlbg5rQLYD6aVuDmtAtgLGcMfVCUEWZKU4F71MrGPoKXK1PrN5h5gkxr72nzpPa&_nc_ohc=RX5OTrPMnkwQ7kNvwFzztor&_nc_oc=Adl_nScksM8YbkLtCHdZCEjqZDu1E7JS7Y82-SL6sgQYYK7ekF-NLGQVjVCeFtXfORE&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&_nc_gid=_5-fxDA5P1jm6gD53r6BuA&oh=00_AfdpEk5R2UlvEznO1QlyjyDjFvew-XCZtk3rYSMTfheGmw&oe=68FD235B',
    icon: 'bi-cpu',
  },
  {
    name: 'FU Guitar Club',
    email: 'fptguitarclub@gmail.com',
    image: 'https://scontent-nrt1-1.xx.fbcdn.net/v/t39.30808-6/559919018_1400630488734208_3866969234193093758_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=111&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeFSzJkaXU0jaP-UkfOBjIENoam4fcBGStahqbh9wEZK1gRiUXyBCE1N6Ip2LmwfpC6j9Su_2YfbnryRj3SFnGph&_nc_ohc=pgsfBAiwQSYQ7kNvwGR7p3a&_nc_oc=AdlhOJWOIkZfaj_1HjEZZsLDg5LSfAEX868bxIcNBzIOtCBUoQNm7aDzFigx-UNc6rU&_nc_zt=23&_nc_ht=scontent-nrt1-1.xx&_nc_gid=6szRfJ8zjewluXpJk8Pl9w&oh=00_AfdFHGk_ewfsLGggnHg3DZUVJFTZ8NRHcLcBB2rKPUy2Kw&oe=68FD3A2F',
    icon: 'bi-music-note-beamed',
  },
  {
    name: 'FPT Business Club',
    email: 'fptubusinessclub1@gmail.com',
    image: 'https://scontent-nrt1-2.xx.fbcdn.net/v/t39.30808-6/557600959_1456110546029856_1801460195446767648_n.png?stp=dst-png_s960x960&_nc_cat=105&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeFV92oj1IWzYAATJxjdBMwDxi35i2hG9d7GLfmLaEb13gd4SCkZkGO_NkChBB9a8SHB_YCARiSQxWy2InikqeTy&_nc_ohc=oqrGUOD1_bEQ7kNvwGVMsN5&_nc_oc=AdnVKdHkvBvnvZWWnMuPs-Y8bQE3ww1LReJVDL1IAF7ncTRw2S6cAPEO8IlhEkAHUJk&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&_nc_gid=vzepQSvN5BxI6euDhdiaZQ&oh=00_AffY8ZKKL9cRO3I04lbFpZrHM82KFwqQmejBxG3RLprQrg&oe=68FD1871',
    icon: 'bi-briefcase',
  },
  {
    name: 'FPTU Photography',
    email: 'fupphotographyy@gmail.com',
    image: 'https://scontent-nrt1-1.xx.fbcdn.net/v/t39.30808-6/476330707_640118642019294_7919388781855403148_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=108&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeHY4fpcRfe_0NXiZrdWQqoqc0Fnc1ZlDLhzQWdzVmUMuFefAAm0zUFa3Uud35ShuW9TsVOoV-eNlg4a85hT0tXm&_nc_ohc=oGnwxE6qfl4Q7kNvwECwx39&_nc_oc=AdnyJPstZJxt8cnxI_qVmXyd0wjRSsNSRsXrao_w0ULc0_0xCUBOfxYtkIb6QWXI1n4&_nc_zt=23&_nc_ht=scontent-nrt1-1.xx&_nc_gid=Zinfs9MpLt-unLI4gtba-g&oh=00_AfcHQp9mnK3KYmCzU3hk510Io-SVMy3L44i0nLa8h7hXGw&oe=68FD1414',
    icon: 'bi-camera',
  },
  {
    name: 'CLB Nhạc Cụ Truyền Thống',
    email: 'clbnhaccutruyenthongfu@gmail.com',
    image: 'https://scontent-nrt1-2.xx.fbcdn.net/v/t39.30808-6/560743130_844300511448657_6372393296892165445_n.jpg?stp=dst-jpg_p180x540_tt6&_nc_cat=107&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeEJUKgo5K54i_9lIItzs5j9TjaHcgCRM85ONodyAJEzzvjE2zfVKkxk8DW_lk52eIKc_DPeKXWzLN0JKpBImQb-&_nc_ohc=JPpBHbHbZ3wQ7kNvwFL8i8y&_nc_oc=AdnfaWr996zkzdeMLs4Mq6XalIHQBsy3hGx6kckWJfIooOXESbo4K8-4k63QVaCBjWw&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&_nc_gid=gK1hy0HeRMfyfbwDpNCOfA&oh=00_AfdFtT077zNr0WPy1mENbLYuowYEEiGJ9pjan_KVRZoDGw&oe=68FD195A',
    icon: 'bi-trophy',
  },
  {
    name: 'IGo Club',
    email: 'igoclubvicongdong@gmail.com',
    image: 'https://scontent-nrt1-1.xx.fbcdn.net/v/t39.30808-6/561019863_1374552141338469_7874668465462290148_n.png?stp=dst-png_s960x960&_nc_cat=108&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeG2lAuEak53rdvw258V-TpKvaK0r7Entlm9orSvsSe2WfQyPXv0YnHKDYjYY8yebVMJeXbzBJd7BlnsSN_VbAl-&_nc_ohc=gZrH0aDKDt4Q7kNvwHHMO1h&_nc_oc=AdlaMplLyrqd8rGYhD5dJE-cOwVLIjbL69lrFVhgriDLQLJ9kRqsVDBAgmsQwT48qRU&_nc_zt=23&_nc_ht=scontent-nrt1-1.xx&_nc_gid=1A3pnLhIdrijACZxyy4Dcw&oh=00_AffuqQNhVRRvABmViMZgPMvMTUj-dznKhYPI8tYSYzD_yQ&oe=68FD1835',
    icon: 'bi-people',
  },
  {
    name: 'FPT English Club',
    email: 'englishclub.fu@gmail.com',
    image: 'https://scontent-nrt1-2.xx.fbcdn.net/v/t39.30808-6/506310579_1288851489910127_4660870555409716150_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeEL56jJO98D4aE2Lmc_0wJt0LPiB9EbFWDQs-IH0RsVYLARhEEMc36o82MH7AmpE7Ctj8Hgqndr5XM-bnkzclrh&_nc_ohc=JIbq98Zs96YQ7kNvwFewksJ&_nc_oc=Admb_ux5NvVvnIpDjgHVR3vgjJ81VvnWKCkKNdG_GA0mwBcNqp5gA8-afuMSbfA0i2c&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&_nc_gid=jk0S1HnhCPylExGxe5gW4g&oh=00_AfcnBA3QNckdb1lIBFTluIV1ObzYNywsZn5gDd4NnwjNIA&oe=68FD2D45',
    icon: 'bi-chat-dots',
  },
]

export default function ClubsPage() {
  const [keyword, setKeyword] = React.useState('')
  const [page, setPage] = React.useState(1)
  const totalPages = 4
  const filtered = React.useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return clubs
    return clubs.filter(c => c.name.toLowerCase().includes(k))
  }, [keyword])

  return (
    <div className="bg-white min-vh-100 d-flex flex-column">
      <Header />

      <main className="flex-grow-1">
        <section className="py-4">
          <div className="container-xl">
            <h2 className="text-center fw-bold mb-2" style={{ color: '#111827' }}>Câu lạc bộ</h2>
            <p className="text-center text-secondary mb-4">Cùng khám phá hơn 48 câu lạc bộ đang hoạt động tại cơ sở</p>

            <div className="d-flex justify-content-center mb-4">
              <div className="input-group" style={{ maxWidth: 560 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên câu lạc bộ"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
                <button className="btn btn-danger">
                  <i className="bi bi-search me-1" />
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="row g-3">
              {filtered.map((c, i) => (
                <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={i}>
                  <div className="card h-100 border-0" style={{ borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
                    <div className="position-relative">
                      <div className="ratio ratio-16x9">
                        <img src={c.image} alt={c.name} className="w-100 h-100 object-fit-cover" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
                      </div>
                      <div className="position-absolute start-50 translate-middle" style={{ bottom: -24 }}>
                        <div className="d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,.12)', marginTop: -22 }}>
                          <div className="d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', color: '#fb923c' }}>
                            <i className={`bi ${c.icon || 'bi-heart-fill'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-body text-center" style={{ paddingTop: 40 }}>
                      <div className="h5 fw-bold mb-1" style={{ color: '#111827' }}>{c.name}</div>
                      <div className="text-secondary mb-3">{c.email}</div>
                      <div className="d-flex justify-content-center">
                        {/* <button className="btn btn-danger d-inline-flex align-items-center gap-2 px-4 py-2 rounded-3">
                          <i className="bi bi-person-plus" />
                          Tuyển thành viên
                        </button> */}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-center mt-4">
              <div className="d-flex align-items-center" style={{ gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn"
                  style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}
                >
                  <i className="bi bi-chevron-left" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className="btn"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid ' + (n === page ? '#f97316' : '#e5e7eb'),
                      background: n === page ? '#f97316' : '#fff',
                      color: n === page ? '#fff' : '#111827',
                      padding: 0,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn"
                  style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}


