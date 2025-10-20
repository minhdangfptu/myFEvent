import { useMemo, useState } from 'react'
import UserLayout from '../../components/UserLayout'

function AddMemberModal({ open, onClose, onConfirm }) {
	const [emails, setEmails] = useState(['', ''])
	const [uploadName, setUploadName] = useState('')

	if (!open) return null

	return (
		<div className="position-fixed top-0 start-0 w-100 h-100" style={{ background:'rgba(0,0,0,0.35)', zIndex:1060 }}>
			<div className="d-flex align-items-start justify-content-center w-100 h-100 p-3">
				<div className="bg-white rounded-3 shadow" style={{ width: 560, maxWidth: '100%' }}>
					<div className="d-flex align-items-center justify-content-between p-3 border-bottom">
						<div className="fw-semibold">Thêm thành viên</div>
						<button className="btn btn-sm btn-light" onClick={onClose} aria-label="Đóng">✕</button>
					</div>
					<div className="p-3">
						<div className="small text-secondary mb-2">Thêm thành viên vào sự kiện, thêm vui!</div>
						<div className="mb-2 fw-semibold">Email</div>
						<div className="d-flex flex-column gap-2 mb-2">
							{emails.map((e, idx) => (
								<input key={idx} type="email" className="form-control" placeholder="you@example.com" value={e} onChange={(ev) => setEmails(arr => arr.map((x, i) => i===idx ? ev.target.value : x))} />
							))}
						</div>
						<button className="btn btn-link p-0 mb-3" onClick={() => setEmails(arr => [...arr, ''])}>+ Thêm email</button>

						<div className="text-center border rounded-3 p-4 mb-2" style={{ borderStyle:'dashed' }}>
							<div className="mb-1">Tải tệp lên hoặc kéo thả tệp</div>
							<div className="text-secondary small">Định dạng Excel</div>
							<input type="file" accept=".xls,.xlsx" className="form-control mt-2" onChange={(e) => setUploadName(e.target.files?.[0]?.name || '')} />
							{uploadName && <div className="small text-secondary mt-2">Đã chọn: {uploadName}</div>}
						</div>
						<a className="small" href="#">Tải template Excel mẫu</a>
					</div>
					<div className="p-3 d-flex justify-content-end gap-2 border-top">
						<button className="btn btn-light" onClick={onClose}>Hủy</button>
						<button className="btn btn-danger" onClick={() => onConfirm({ emails, uploadName })}>Xác nhận</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function ManageMemberPage() {
	const [showModal, setShowModal] = useState(false)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Tên')

	const rows = useMemo(() => (
		Array.from({ length: 14 }).map((_, i) => ({
			id: i + 1,
			name: ['Đặng Đình Minh','Arlene McCoy','Cody Fisher','Esther Howard','Ronald Richards','Albert Flores','Marvin McKinney','Floyd Miles','Courtney Henry','Guy Hawkins','Ralph Edwards','Devon Lane'][i%12],
			dept: ['TBTC','Hậu cần','HR','Nội dung'][i%4],
			role: ['Trưởng ban tổ chức','Phó ban tổ chức','Trưởng ban','Thành viên'][i%4],
			avatar: `https://i.pravatar.cc/100?img=${i+1}`
		}))
	), [])

	const filtered = rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))

	return (
		<UserLayout title="Tất cả thành viên (104)" activePage="members" showSearch={false}>
			<style>{`
				.cell-action{cursor:pointer}
				.table thead th{font-size:12px;color:#6b7280;font-weight:600;border-bottom-color:#e5e7eb}
			`}</style>
			<div className="container-fluid" style={{ maxWidth: 1150 }}>
				<div className="d-flex align-items-center justify-content-between mb-3">
					<div className="d-flex align-items-center gap-2">
						<div className="fw-semibold" style={{ color:'#EF4444' }}>FPTU Halloween 2024</div>
					</div>
					<div className="d-flex align-items-center gap-2">
						<button className="btn btn-danger d-inline-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
							<i className="bi bi-plus" />
							Thêm thành viên
						</button>
					</div>
				</div>

				<div className="d-flex align-items-center gap-3 mb-3">
					<div className="position-relative" style={{ maxWidth: 300, width: '100%' }}>
						<i className="bi bi-search position-absolute" style={{ left: 10, top: 10, color:'#9ca3af' }} />
						<input className="form-control ps-4" placeholder="Tìm kiếm" value={query} onChange={(e) => setQuery(e.target.value)} />
					</div>
					<div className="ms-auto d-flex align-items-center gap-2">
						<span className="text-secondary small">Sắp xếp theo:</span>
						<select className="form-select form-select-sm" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 160 }}>
							<option>Tên</option>
							<option>Ban</option>
							<option>Vai trò</option>
						</select>
					</div>
				</div>

				<div className="card border-0 shadow-sm">
					<div className="table-responsive">
						<table className="table align-middle mb-0">
							<thead>
								<tr>
									<th style={{ width: 48 }}><input type="checkbox" /></th>
									<th>Ảnh</th>
									<th>Tên</th>
									<th>Ban</th>
									<th>Vai trò</th>
									<th style={{ width: 56 }}>Action</th>
								</tr>
							</thead>
							<tbody>
								{filtered.slice(0,10).map(r => (
									<tr key={r.id}>
										<td><input type="checkbox" /></td>
										<td><img src={r.avatar} className="rounded-circle" style={{ width:28,height:28 }} /></td>
										<td>{r.name}</td>
										<td>{r.dept}</td>
										<td>{r.role}</td>
										<td className="cell-action text-end"><i className="bi bi-three-dots" /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="d-flex align-items-center justify-content-between px-3 py-2 border-top">
						<div className="text-secondary small">Dòng 1 - 10 trong tổng số 104 dòng</div>
						<div className="d-flex align-items-center gap-2">
							<span className="text-secondary small">Hiển thị</span>
							<select className="form-select form-select-sm" style={{ width: 72 }} defaultValue={10}>
								<option>10</option>
								<option>20</option>
							</select>
							<nav>
								<ul className="pagination pagination-sm mb-0">
									<li className="page-item"><a className="page-link" href="#">«</a></li>
									<li className="page-item"><a className="page-link" href="#">1</a></li>
									<li className="page-item active"><span className="page-link">2</span></li>
									<li className="page-item"><a className="page-link" href="#">3</a></li>
									<li className="page-item"><a className="page-link" href="#">»</a></li>
								</ul>
							</nav>
						</div>
					</div>
				</div>

				<AddMemberModal
					open={showModal}
					onClose={() => setShowModal(false)}
					onConfirm={() => setShowModal(false)}
				/>
			</div>
		</UserLayout>
	)
}


