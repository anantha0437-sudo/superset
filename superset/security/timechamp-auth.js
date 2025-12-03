async function timechampLogout() {
  const token = localStorage.getItem("CurrentUser");
  const origin = "https://btrak4350-development.snovasys.com";
  const url = `${origin}/backend/api/LoginApi/SignOutAudit`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
    });

    const result = await response.json();

    if (result?.Success === true && result?.data === true) {
      console.log("TimeChamp logout succeeded");
      localStorage.clear();
      window.location.href = `${origin}/signin/`;
    } else {
      console.warn("TimeChamp logout failed");
      window.location.href = `${origin}/signin/`;
    }
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = `${origin}/signin/`;
  }
}

timechampLogout();
