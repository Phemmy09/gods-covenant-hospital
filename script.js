/* ============================================================
   GOD'S COVENANT HOSPITAL — Main JavaScript v2.0
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar scroll effect ── */
  const navbar = document.querySelector('.navbar');
  const onScroll = () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Mobile menu ── */
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  /* ── Active nav link ── */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a, .mobile-menu a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (href === currentFile || (currentFile === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ── Fade-up intersection observer ── */
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

  /* ================================================================
     CHATBOT — handled by chatbot-frontend.js
     ================================================================ */

  /* ================================================================
     CONTACT PAGE FORM
     ================================================================ */
  const contactPageForm = document.getElementById('contactPageForm');
  if (contactPageForm) {
    contactPageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: contactPageForm.cp_name.value.trim(),
        email: contactPageForm.cp_email.value.trim(),
        phone: contactPageForm.cp_phone.value.trim(),
        address: contactPageForm.cp_address.value.trim(),
        inquiry: contactPageForm.cp_inquiry.value.trim(),
        source: 'contact-page',
      };
      saveContact(data);
      showFormSuccess(contactPageForm.querySelector('.form-submit-btn'), 'Message Sent! ✓');
      contactPageForm.reset();
    });
  }

  /* ================================================================
     REVIEW FORM
     ================================================================ */
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const ratingInput = document.getElementById('ratingValue');
      const data = {
        name: reviewForm.r_name.value.trim(),
        email: reviewForm.r_email.value.trim(),
        phone: reviewForm.r_phone.value.trim(),
        review: reviewForm.r_review.value.trim(),
        rating: ratingInput ? ratingInput.value : '5',
        type: 'review',
        source: 'review-page',
      };
      if (!data.name || !data.review) return;
      saveReview(data);
      showFormSuccess(reviewForm.querySelector('.form-submit-btn'), 'Review Submitted! ✓');
      reviewForm.reset();
      document.querySelectorAll('.star-btn').forEach(s => s.classList.remove('active'));
      if (ratingInput) ratingInput.value = '5';
    });
  }

  /* ── Star rating ── */
  const starBtns = document.querySelectorAll('.star-btn');
  starBtns.forEach((star, idx) => {
    star.addEventListener('click', () => {
      starBtns.forEach((s, i) => s.classList.toggle('active', i <= idx));
      const ratingInput = document.getElementById('ratingValue');
      if (ratingInput) ratingInput.value = idx + 1;
    });
    star.addEventListener('mouseenter', () => {
      starBtns.forEach((s, i) => {
        s.style.color = i <= idx ? '#F59E0B' : '';
      });
    });
    star.addEventListener('mouseleave', () => {
      starBtns.forEach(s => { s.style.color = ''; });
    });
  });

  /* ================================================================
     STORAGE HELPERS
     ================================================================ */
  function saveContact(data) {
    try {
      const contacts = JSON.parse(localStorage.getItem('gch_contacts') || '[]');
      contacts.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...data
      });
      localStorage.setItem('gch_contacts', JSON.stringify(contacts));
    } catch (err) { console.warn('Storage error:', err); }
  }

  function saveReview(data) {
    try {
      const reviews = JSON.parse(localStorage.getItem('gch_reviews') || '[]');
      reviews.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...data
      });
      localStorage.setItem('gch_reviews', JSON.stringify(reviews));
    } catch (err) { console.warn('Storage error:', err); }
  }

  /* ── UI Helpers ── */
  function showFormSuccess(btn, text) {
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = text;
    btn.style.background = '#10B981';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
    }, 4000);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ================================================================
     ADMIN PAGE
     ================================================================ */
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminDashboard = document.getElementById('adminDashboard');
  const adminLockScreen = document.getElementById('adminLockScreen');

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = document.getElementById('adminPassword');
      if (pw && pw.value === 'GCH@admin2026') {
        sessionStorage.setItem('gch_admin', '1');
        showAdminDashboard();
      } else {
        const err = document.getElementById('adminError');
        if (err) { err.textContent = 'Incorrect password. Try again.'; err.style.display = 'block'; }
      }
    });
  }

  if (adminDashboard && adminLockScreen) {
    if (sessionStorage.getItem('gch_admin') === '1') {
      showAdminDashboard();
    }
  }

  function showAdminDashboard() {
    if (adminLockScreen) adminLockScreen.style.display = 'none';
    if (adminDashboard) {
      adminDashboard.style.display = 'block';
      renderAdminData();
    }
  }

  function renderAdminData() {
    const contacts = JSON.parse(localStorage.getItem('gch_contacts') || '[]');
    const reviews = JSON.parse(localStorage.getItem('gch_reviews') || '[]');
    const all = [...contacts, ...reviews].sort((a, b) => b.id - a.id);

    // Stats
    const totalEl = document.getElementById('stat-total');
    const todayEl = document.getElementById('stat-today');
    const reviewsEl = document.getElementById('stat-reviews');
    const chatEl = document.getElementById('stat-chat');
    const histEl = document.getElementById('stat-histories');
    if (totalEl) totalEl.textContent = all.length;
    const today = new Date().toDateString();
    if (todayEl) todayEl.textContent = all.filter(x => new Date(x.timestamp).toDateString() === today).length;
    if (reviewsEl) reviewsEl.textContent = reviews.length;
    if (chatEl) chatEl.textContent = contacts.filter(x => x.source === 'chatbot').length;
    if (histEl) histEl.textContent = JSON.parse(localStorage.getItem('gch_chat_histories') || '[]').length;

    // Contacts table
    const tbody = document.getElementById('contactsTableBody');
    if (tbody) {
      if (all.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#64748B">No contacts yet.</td></tr>';
      } else {
        // Build a lookup of chat histories by contact phone for quick matching
        const histories = JSON.parse(localStorage.getItem('gch_chat_histories') || '[]');
        tbody.innerHTML = all.map(c => {
          // Find a matching chat history by phone
          const histIdx = histories.sort((a,b) => b.id - a.id)
            .findIndex(h => h.contact?.phone === c.phone);
          const chatBtn = (c.source === 'chatbot' && histIdx !== -1)
            ? `<button class="view-chat-btn" onclick="openChatModal(${histIdx})"><i class="fas fa-eye"></i> View</button>`
            : (c.source === 'chatbot' ? '<span style="color:#94A3B8;font-size:0.75rem">Pending</span>' : '—');
          return `
          <tr>
            <td>${new Date(c.timestamp).toLocaleDateString()}<br><small style="color:#94A3B8">${new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></td>
            <td><strong>${escapeHtml(c.name || '—')}</strong></td>
            <td>${escapeHtml(c.phone || '—')}</td>
            <td>${escapeHtml(c.email || '—')}</td>
            <td>${escapeHtml(c.address || '—')}</td>
            <td style="max-width:200px">${escapeHtml((c.inquiry || c.review || '—').substring(0,100))}${((c.inquiry || c.review || '').length > 100) ? '…' : ''}</td>
            <td><span style="background:${c.source==='chatbot'?'#FFF4EE;color:#E8722A':c.source==='review-page'?'#EAF9F8;color:#3AADA6':'#F1F5F9;color:#475569'};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600">${c.source || 'contact'}</span></td>
            <td>${c.rating ? '★'.repeat(parseInt(c.rating)) : '—'}</td>
            <td>${chatBtn}</td>
          </tr>`;
        }).join('');
      }
    }
  }

  // Export CSV
  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const contacts = JSON.parse(localStorage.getItem('gch_contacts') || '[]');
      const reviews = JSON.parse(localStorage.getItem('gch_reviews') || '[]');
      const all = [...contacts, ...reviews].sort((a, b) => b.id - a.id);
      if (all.length === 0) { alert('No data to export.'); return; }
      const headers = ['Date', 'Time', 'Name', 'Email', 'Phone', 'Address', 'Message/Review', 'Source', 'Rating'];
      const rows = all.map(c => [
        new Date(c.timestamp).toLocaleDateString(),
        new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        c.name || '', c.email || '', c.phone || '', c.address || '',
        (c.inquiry || c.review || '').replace(/,/g, ';'),
        c.source || '', c.rating || ''
      ]);
      const csv = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `GCH_Contacts_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  // Clear all contacts (with confirm)
  const clearBtn = document.getElementById('clearContactsBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete ALL contacts and reviews? This cannot be undone.')) {
        localStorage.removeItem('gch_contacts');
        localStorage.removeItem('gch_reviews');
        renderAdminData();
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('adminLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('gch_admin');
      location.reload();
    });
  }

});
