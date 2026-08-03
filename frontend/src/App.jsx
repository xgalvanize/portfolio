import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stack from './components/Stack'
import Projects from './components/Projects'
import Contact from './components/Contact'
import AdminInbox from './components/AdminInbox'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stack />
        <Projects />
        <Contact />
        <AdminInbox />
      </main>
      <Footer />
    </>
  )
}
