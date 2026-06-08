package com.jobhunter.app;

import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "JobScraper")
public class JobScraperPlugin extends Plugin {

    private WebView hiddenWebView;
    private Handler handler = new Handler(Looper.getMainLooper());
    private PluginCall activeCall = null;
    private String currentPlatform = "";

    // ─── Plugin Methods ─────────────────────────────────────────────────────

    @PluginMethod
    public void scrapeLinkedIn(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        JSArray keywordsArr = call.getArray("keywords", new JSArray());
        String location = call.getString("location", "Bangalore");

        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Email and password required");
            return;
        }

        List<String> keywords = new ArrayList<>();
        try {
            for (int i = 0; i < keywordsArr.length(); i++) {
                keywords.add(keywordsArr.getString(i));
            }
        } catch (JSONException ignored) {}

        final String query = keywords.isEmpty() ? "Dynamics 365" : String.join(" ", keywords);
        final String fLocation = location;

        getBridge().executeOnMainThread(() -> {
            activeCall = call;
            currentPlatform = "linkedin";
            destroyHiddenWebView();
            setupLinkedInScraper(email, password, query, fLocation);
        });
    }

    @PluginMethod
    public void scrapeNaukri(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        JSArray keywordsArr = call.getArray("keywords", new JSArray());
        String location = call.getString("location", "Bangalore");

        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Email and password required");
            return;
        }

        List<String> keywords = new ArrayList<>();
        try {
            for (int i = 0; i < keywordsArr.length(); i++) {
                keywords.add(keywordsArr.getString(i));
            }
        } catch (JSONException ignored) {}

        final String query = keywords.isEmpty() ? "Dynamics 365" : String.join(" ", keywords);

        getBridge().executeOnMainThread(() -> {
            activeCall = call;
            currentPlatform = "naukri";
            destroyHiddenWebView();
            setupNaukriScraper(email, password, query);
        });
    }

    // ─── LinkedIn Scraper ─────────────────────────────────────────────────────

    private void setupLinkedInScraper(String email, String password, String query, String location) {
        try {
            String encodedQuery = URLEncoder.encode(query, "UTF-8");
            String encodedLoc = URLEncoder.encode(location, "UTF-8");
            String jobsUrl = "https://www.linkedin.com/jobs/search/?keywords=" + encodedQuery
                    + "&location=" + encodedLoc + "&f_TPR=r604800&sortBy=DD&distance=25";

            createHiddenWebView(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    // Step 1: Check if login page
                    if (url.contains("/login") || url.contains("login")) {
                        // Fill credentials
                        handler.postDelayed(() -> {
                            fillLinkedInLogin(view, email, password);
                            // Wait for redirect after submit
                            handler.postDelayed(() -> checkLinkedInPostLogin(view, jobsUrl), 6000);
                        }, 2500);
                    } else if (url.contains("/jobs/search") || url.contains("jobs")) {
                        // Already on jobs page — extract
                        handler.postDelayed(() -> scrollAndExtractLinkedIn(view, 0, location), 5000);
                    } else if (url.startsWith("https://www.linkedin.com/feed") || url.contains("linkedin.com/")) {
                        // Logged in but not on jobs page — navigate to search
                        view.loadUrl(jobsUrl);
                    }
                }

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    // Check for blocking
                    if (url.contains("challenge") || url.contains("checkpoint")) {
                        failWith("Login blocked — complete 2FA in browser first", true);
                    }
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return false;
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    // Ignore sub-resource errors, only fail on main frame
                }
            });

            hiddenWebView.loadUrl("https://www.linkedin.com/login");

            // Safety timeout: resolve with empty result after 45s
            handler.postDelayed(() -> {
                if (activeCall != null) {
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("message", "LinkedIn scrape timed out");
                    result.put("blocked", true);
                    result.put("jobs", new JSONArray());
                    try { activeCall.resolve(result); } catch (Exception ignored) {}
                    activeCall = null;
                    destroyHiddenWebView();
                }
            }, 45000);

        } catch (Exception e) {
            failWith("Setup error: " + e.getMessage(), false);
        }
    }

    private void checkLinkedInPostLogin(WebView view, String jobsUrl) {
        String currentUrl = view.getUrl() != null ? view.getUrl() : "";
        if (currentUrl.contains("/login") || currentUrl.contains("challenge") || currentUrl.contains("checkpoint")) {
            failWith("Login failed — check credentials", true);
            return;
        }
        // Navigate to jobs search
        view.loadUrl(jobsUrl);
    }

    private void fillLinkedInLogin(WebView view, String email, String password) {
        String js = "(function() {" +
            "var s = ['#username','input[name=\"session_key\"]','input[type=\"email\"]','#ap_email'];" +
            "var el = null; for (var i = 0; i < s.length; i++) { var e = document.querySelector(s[i]); if (e) { el = e; break; } }" +
            "if (!el) return;" +
            "el.value = ''; el.focus();" +
            "var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
            "nativeSetter.call(el, '" + jsEscape(email) + "');" +
            "el.dispatchEvent(new Event('input', {bubbles:true}));" +
            "el.dispatchEvent(new Event('change', {bubbles:true}));" +
            "var pw = document.querySelector('#password'); if (!pw) return;" +
            "pw.value = ''; pw.focus();" +
            "nativeSetter.call(pw, '" + jsEscape(password) + "');" +
            "pw.dispatchEvent(new Event('input', {bubbles:true}));" +
            "pw.dispatchEvent(new Event('change', {bubbles:true}));" +
            "setTimeout(function() {" +
            "  var btn = document.querySelector('button[type=\"submit\"]');" +
            "  if (btn) btn.click();" +
            "  else document.querySelector('form')?.submit();" +
            "}, 800);" +
        "})()";
        view.evaluateJavascript(js, null);
    }

    private void scrollAndExtractLinkedIn(WebView view, int scrollCount, String location) {
        if (scrollCount < 3) {
            view.evaluateJavascript("window.scrollBy(0, 800);'ok'", null);
            handler.postDelayed(() -> scrollAndExtractLinkedIn(view, scrollCount + 1, location), 1500);
        } else {
            handler.postDelayed(() -> {
                String js = "(function() {" +
                    "var r = [];" +
                    "var c = document.querySelectorAll('.jobs-search-results__list-item, .occludable-job-card, [data-occludable-job-id], .job-card-container');" +
                    "c.forEach(function(card) {" +
                    "  var t = (card.querySelector('.job-card-list__title--link, .occludable-job-card__title, a[data-job-id]') || {}).textContent;" +
                    "  if (!t || (t || '').includes('Promoted')) return; t = t.trim();" +
                    "  var co = (card.querySelector('.job-card-container__company-name, .occludable-job-card__company-name') || {}).textContent;" +
                    "  var lo = (card.querySelector('.job-card-container__metadata-item') || {}).textContent;" +
                    "  var lk = (card.querySelector('a[href*=\"/jobs/\"]') || {}).getAttribute('href') || '';" +
                    "  if (lk.startsWith('/')) lk = 'https://www.linkedin.com' + lk.split('?')[0];" +
                    "  var sa = (card.querySelector('.job-card-container__salary-info') || {}).textContent;" +
                    "  r.push({title:t, company:(co||'').trim(), location:(lo||'" + jsEscape(location) + "').trim(), salary:(sa||'').trim(), url:lk, source:'LinkedIn', sourceColor:'#0077b5'});" +
                    "});" +
                    "JSON.stringify({jobs:r.slice(0,30),count:c.length});" +
                "})()";
                view.evaluateJavascript(js, value -> {
                    try {
                        String json = value != null ? value : "{\"jobs\":[],\"count\":0}";
                        if (json.startsWith("\"") && json.endsWith("\"")) {
                            json = json.substring(1, json.length() - 1).replace("\\\"", "\"");
                        }
                        JSONObject data = new JSONObject(json);
                        JSONArray jobs = data.getJSONArray("jobs");
                        JSObject result = new JSObject();
                        if (jobs.length() > 0) {
                            result.put("success", true);
                            result.put("jobs", jobs);
                        } else {
                            result.put("success", false);
                            result.put("message", "No jobs found");
                            result.put("blocked", true);
                            result.put("jobs", new JSONArray());
                        }
                        resolveWith(result);
                    } catch (JSONException e) {
                        failWith("Parse error: " + e.getMessage(), false);
                    }
                });
            }, 2000);
        }
    }

    // ─── Naukri Scraper ───────────────────────────────────────────────────────

    private void setupNaukriScraper(String email, String password, String query) {
        try {
            String encodedQuery = URLEncoder.encode(query, "UTF-8");
            String searchUrl = "https://www.naukri.com/jobs-in-bangalore?q=" + encodedQuery
                    + "&k=" + encodedQuery + "&l=Bangalore&experience=4-10";

            createHiddenWebView(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    if (url.contains("login") || url.contains("nlogin")) {
                        handler.postDelayed(() -> fillNaukriLogin(view, email, password), 3000);
                        handler.postDelayed(() -> {
                            String cur = view.getUrl() != null ? view.getUrl() : "";
                            if (cur.contains("login")) {
                                // Still on login — try submitting any way
                                view.evaluateJavascript(
                                    "var btn=document.querySelector('button[type=\"submit\"],.btn-login,input[type=\"submit\"],#loginButton'); if(btn)btn.click(); else document.querySelector('form')?.submit();",
                                    null);
                                handler.postDelayed(() -> view.loadUrl(searchUrl), 6000);
                            } else {
                                view.loadUrl(searchUrl);
                            }
                        }, 6000);
                    } else if (url.contains("naukri.com") && !url.contains("login")) {
                        // Already on search or logged in
                        handler.postDelayed(() -> scrollAndExtractNaukri(view, 0), 5000);
                    }
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return false;
                }
            });

            hiddenWebView.loadUrl("https://www.naukri.com/nlogin/login");

            // Safety timeout
            handler.postDelayed(() -> {
                if (activeCall != null) {
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("message", "Naukri scrape timed out");
                    result.put("blocked", true);
                    result.put("jobs", new JSONArray());
                    try { activeCall.resolve(result); } catch (Exception ignored) {}
                    activeCall = null;
                    destroyHiddenWebView();
                }
            }, 45000);

        } catch (Exception e) {
            failWith("Setup error: " + e.getMessage(), false);
        }
    }

    private void fillNaukriLogin(WebView view, String email, String password) {
        String js = "(function() {" +
            "var em = document.querySelector('input[type=\"email\"], input[id=\"emailField\"], input[name=\"email\"]');" +
            "var pw = document.querySelector('input[type=\"password\"], input[id=\"passwordField\"], input[name=\"password\"]');" +
            "if (!em || !pw) return;" +
            "em.value = ''; em.focus();" +
            "var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
            "ns.call(em, '" + jsEscape(email) + "');" +
            "em.dispatchEvent(new Event('input', {bubbles:true}));" +
            "em.dispatchEvent(new Event('change', {bubbles:true}));" +
            "pw.value = ''; pw.focus();" +
            "ns.call(pw, '" + jsEscape(password) + "');" +
            "pw.dispatchEvent(new Event('input', {bubbles:true}));" +
            "pw.dispatchEvent(new Event('change', {bubbles:true}));" +
            "setTimeout(function() {" +
            "  var btn = document.querySelector('button[type=\"submit\"], .btn-login, input[type=\"submit\"], #loginButton');" +
            "  if (btn) btn.click();" +
            "  else document.querySelector('form')?.submit();" +
            "}, 800);" +
        "})()";
        view.evaluateJavascript(js, null);
    }

    private void scrollAndExtractNaukri(WebView view, int scrollCount) {
        if (scrollCount < 3) {
            view.evaluateJavascript("window.scrollBy(0, 600);'ok'", null);
            handler.postDelayed(() -> scrollAndExtractNaukri(view, scrollCount + 1), 1200);
        } else {
            handler.postDelayed(() -> {
                String js = "(function() {" +
                    "var r = [];" +
                    "var c = document.querySelectorAll('.jobTuple, article[class*=\"job\"], .resumeaccordion');" +
                    "c.forEach(function(card) {" +
                    "  var t = (card.querySelector('.title, [class*=\"title\"], a[href*=\"/job/\"') || {}).textContent;" +
                    "  if (!t) return; t = t.trim();" +
                    "  var co = (card.querySelector('.company, [class*=\"company\"], .subTitle') || {}).textContent;" +
                    "  var lo = (card.querySelector('.location, [class*=\"location\"]') || {}).textContent;" +
                    "  var sa = (card.querySelector('.salary, [class*=\"salary\"]') || {}).textContent;" +
                    "  var ex = (card.querySelector('.experience, [class*=\"experience\"]') || {}).textContent;" +
                    "  var lk = (card.querySelector('a[href*=\"/job/\"]') || {}).getAttribute('href') || '';" +
                    "  r.push({title:t, company:(co||'').trim(), location:(lo||'Bangalore').trim(), salary:(sa||ex||'₹ As per profile').trim(), url:lk, source:'Naukri', sourceColor:'#d32f2f'});" +
                    "});" +
                    "JSON.stringify({jobs:r.slice(0,30),count:c.length});" +
                "})()";
                view.evaluateJavascript(js, value -> {
                    try {
                        String json = value != null ? value : "{\"jobs\":[],\"count\":0}";
                        if (json.startsWith("\"") && json.endsWith("\"")) {
                            json = json.substring(1, json.length() - 1).replace("\\\"", "\"");
                        }
                        JSONObject data = new JSONObject(json);
                        JSONArray jobs = data.getJSONArray("jobs");
                        JSObject result = new JSObject();
                        if (jobs.length() > 0) {
                            result.put("success", true);
                            result.put("jobs", jobs);
                        } else {
                            result.put("success", false);
                            result.put("message", "No jobs found");
                            result.put("blocked", true);
                            result.put("jobs", new JSONArray());
                        }
                        resolveWith(result);
                    } catch (JSONException e) {
                        failWith("Parse error: " + e.getMessage(), false);
                    }
                });
            }, 2000);
        }
    }

    // ─── WebView Management ────────────────────────────────────────────────────

    private void createHiddenWebView(WebViewClient client) {
        destroyHiddenWebView();
        hiddenWebView = new WebView(getActivity());
        hiddenWebView.setVisibility(android.view.View.INVISIBLE);
        hiddenWebView.getSettings().setJavaScriptEnabled(true);
        hiddenWebView.getSettings().setUserAgentString(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
        hiddenWebView.getSettings().setDomStorageEnabled(true);
        hiddenWebView.getSettings().setLoadWithOverviewMode(true);
        hiddenWebView.getSettings().setUseWideViewPort(true);
        hiddenWebView.getSettings().setAllowContentAccess(true);
        hiddenWebView.getSettings().setAllowFileAccess(false);
        hiddenWebView.getSettings().setMixedContentMode(
            android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        hiddenWebView.setWebViewClient(client);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(hiddenWebView, true);
        getActivity().addContentView(hiddenWebView,
            new android.view.ViewGroup.LayoutParams(1, 1));
    }

    private void destroyHiddenWebView() {
        if (hiddenWebView != null) {
            hiddenWebView.stopLoading();
            hiddenWebView.destroy();
            hiddenWebView = null;
        }
    }

    // ─── Callback Helpers ──────────────────────────────────────────────────────

    private void resolveWith(JSObject result) {
        if (activeCall != null) {
            PluginCall call = activeCall;
            activeCall = null;
            handler.post(() -> {
                try { call.resolve(result); } catch (Exception ignored) {}
                destroyHiddenWebView();
            });
        }
    }

    private void failWith(String message, boolean blocked) {
        if (activeCall != null) {
            PluginCall call = activeCall;
            activeCall = null;
            handler.post(() -> {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("message", message);
                result.put("blocked", blocked);
                result.put("jobs", new JSONArray());
                try { call.resolve(result); } catch (Exception ignored) {}
                destroyHiddenWebView();
            });
        }
    }

    // ─── Utility ───────────────────────────────────────────────────────────────

    private String jsEscape(String s) {
        return s.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}