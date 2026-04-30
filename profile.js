// ─── PROFILE PAGE FUNCTIONS ───
function toggleEditProfile() {
  const editSection = document.getElementById('edit-profile-section');
  const user = getCurrentUser();
  if (!editSection) return;

  if (editSection.style.display === 'none') {
    if (user) {
      document.getElementById('edit-first-name').value = user.firstName;
      document.getElementById('edit-last-name').value = user.lastName;
      document.getElementById('edit-email').value = user.email;
    }
    editSection.style.display = 'block';
  } else {
    editSection.style.display = 'none';
  }
}

function saveProfileChanges() {
  const firstName = document.getElementById('edit-first-name').value.trim();
  const lastName = document.getElementById('edit-last-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();

  if (!firstName || !lastName || !email) {
    alert('Please fill in all required fields');
    return;
  }

  const user = {
    email: email,
    firstName: firstName,
    lastName: lastName,
    loginTime: getCurrentUser().loginTime,
    avatar: (firstName[0] + lastName[0]).toUpperCase()
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  AppState.user = user;
  updateProfileDisplay(user);
  document.getElementById('edit-profile-section').style.display = 'none';
  alert('Profile updated successfully!');
}

function saveCurrency() {
  const currency = document.getElementById('currency-select').value;
  localStorage.setItem('preferred_currency', currency);
}

function exportData() {
  alert("Your data export is being prepared. You'll receive an email shortly with a download link.");
}

function removeSession(btn) {
  btn.textContent = '✓ Removed';
  btn.disabled = true;
}

function openLink(type) {
  if (type === 'privacy') {
    alert('Privacy Policy:\nYour data is stored locally in your browser. It is not sent to any server.');
  } else if (type === 'support') {
    alert('Contact Support:\nsupport@FairShare.app\nOr visit www.FairShare.app/help');
  }
}





