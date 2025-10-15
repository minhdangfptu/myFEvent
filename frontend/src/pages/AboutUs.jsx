import * as React from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Header from '../components/Header'
import Footer from '../components/Footer'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import GroupsIcon from '@mui/icons-material/Groups'
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'

function MaxContainer({ children }) {
  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 2 } }}>
      {children}
    </Container>
  )
}

function Illustration() {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 420, mx: 'auto' }}>
      <Box sx={{ bgcolor: '#F3F4F6', borderRadius: 2, p: 3, boxShadow: 3 }}>
        <Stack spacing={1.5}>
          <Box sx={{ height: 10, width: 120, bgcolor: '#D1D5DB', borderRadius: 1 }} />
          <Box sx={{ height: 8, width: 96, bgcolor: '#E5E7EB', borderRadius: 1 }} />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {[ '#3B82F6', '#F59E0B', '#10B981' ].map((c, i) => (
              <Grid item xs={4} key={i}>
                <Box sx={{ bgcolor: '#FFFFFF', p: 1.5, borderRadius: 2, boxShadow: 1 }}>
                  <Box sx={{ height: 64, borderRadius: 1, bgcolor: c, opacity: 0.9 }} />
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ bgcolor: '#111827', p: 2, borderRadius: 2 }}>
            <Stack direction="row" sx={{ height: 80 }} spacing={1}>
              {[45, 70, 55, 85, 60, 90].map((h, idx) => (
                <Box key={idx} sx={{ flex: 1, alignSelf: 'flex-end', height: `${h}%`, bgcolor: '#EF4444', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

export default function AboutUs() {
  return (
    <>
      <Header />
      <Box sx={{ bgcolor: '#fff' }}>
      <Box sx={{ py: { xs: 8, md: 12 }, background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)' }}>
        <MaxContainer>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.6rem' }, color: '#111827' }}>
                  Chúng tôi là myFEvent, nền tảng quản lý sự kiện dành cho sinh viên
                </Typography>
                <Typography sx={{ fontSize: '1.05rem', color: '#6B7280' }}>
                  myFEvent hướng tới hỗ trợ các CLB, tổ chức sinh viên tổ chức và vận hành hoạt động hiệu quả hơn, minh bạch hơn và kết nối tốt hơn.
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>Tìm hiểu thêm</Button>
                  <Button variant="outlined" sx={{ color: '#374151', borderColor: '#D1D5DB', '&:hover': { borderColor: '#9CA3AF', bgcolor: '#F9FAFB' } }}>Liên hệ</Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Illustration />
            </Grid>
          </Grid>
        </MaxContainer>
      </Box>

      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#fff' }}>
        <MaxContainer>
          <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#111827' }}>Sứ mệnh của chúng tôi</Typography>
            <Typography sx={{ color: '#6B7280', maxWidth: 760 }}>myFEvent mong muốn mang lại trải nghiệm quản lý sự kiện tốt hơn cho người tổ chức lẫn người tham gia thông qua các công cụ hiện đại và dữ liệu.</Typography>
          </Stack>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined" sx={{ borderColor: '#E5E7EB' }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#DBEAFE', display: 'grid', placeItems: 'center', mb: 2 }}>
                    <EventAvailableIcon sx={{ color: '#3B82F6' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#111827" gutterBottom>Tổ chức hiệu quả</Typography>
                  <Typography color="#6B7280">Quy trình rõ ràng, phân công minh bạch và theo dõi tiến độ trực quan.</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined" sx={{ borderColor: '#E5E7EB' }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#FEF3C7', display: 'grid', placeItems: 'center', mb: 2 }}>
                    <GroupsIcon sx={{ color: '#F59E0B' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#111827" gutterBottom>Kết nối cộng đồng</Typography>
                  <Typography color="#6B7280">Gắn kết thành viên, mở rộng mạng lưới và chia sẻ tri thức dễ dàng.</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined" sx={{ borderColor: '#E5E7EB' }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#DCFCE7', display: 'grid', placeItems: 'center', mb: 2 }}>
                    <EmojiObjectsIcon sx={{ color: '#10B981' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#111827" gutterBottom>Thúc đẩy sáng tạo</Typography>
                  <Typography color="#6B7280">Tạo môi trường để ý tưởng được nuôi dưỡng và triển khai nhanh chóng.</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined" sx={{ borderColor: '#E5E7EB' }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#FCE7F3', display: 'grid', placeItems: 'center', mb: 2 }}>
                    <FavoriteBorderIcon sx={{ color: '#EC4899' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#111827" gutterBottom>Phát triển bền vững</Typography>
                  <Typography color="#6B7280">Dựa trên dữ liệu, minh bạch và hiệu quả để xây dựng giá trị dài hạn.</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MaxContainer>
      </Box>

      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F9FAFB' }}>
        <MaxContainer>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827' }}>Câu chuyện của myFEvent</Typography>
                <Typography sx={{ color: '#6B7280' }}>
                  Bắt nguồn từ mong muốn giúp các CLB và tổ chức sinh viên vận hành sự kiện tốt hơn, myFEvent được xây dựng dựa trên kinh nghiệm thực tế và phản hồi liên tục.
                </Typography>
                <Typography sx={{ color: '#6B7280' }}>
                  Chúng tôi tin rằng công nghệ có thể góp phần giúp quy trình tổ chức minh bạch và hiệu quả. Từ lập kế hoạch, ngân sách, nhân sự cho tới đánh giá sau sự kiện, tất cả được tích hợp trong một nền tảng.
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 4 }}>
                <Box component="img" src="https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=1200&auto=format&fit=crop" alt="Team working" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            </Grid>
          </Grid>
        </MaxContainer>
      </Box>

      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#fff' }}>
        <MaxContainer>
          <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827' }}>Đội ngũ myFEvent</Typography>
            <Typography sx={{ color: '#6B7280', maxWidth: 760 }}>Những người trẻ mang tinh thần sáng tạo, trách nhiệm và đam mê đổi mới trong hoạt động sinh viên.</Typography>
          </Stack>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ flexWrap: 'wrap' }}>
            {[ 'https://i.pravatar.cc/150?img=1', 'https://i.pravatar.cc/150?img=2', 'https://i.pravatar.cc/150?img=3', 'https://i.pravatar.cc/150?img=4', 'https://i.pravatar.cc/150?img=5' ].map((src, idx) => (
              <Avatar key={idx} src={src} sx={{ width: 72, height: 72, boxShadow: 2 }} />
            ))}
          </Stack>
        </MaxContainer>
      </Box>

      </Box>
      <Footer />
    </>
  )
}


