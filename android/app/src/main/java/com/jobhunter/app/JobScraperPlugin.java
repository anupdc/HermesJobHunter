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

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@CapacitorPlugin(name = "JobScraper")
public class JobScraperPlugin extends Plugin {

    private WebView hiddenWebView;
    private Handler handler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void scrapeLinkedIn(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        JSArray keywordsArr = call.getArray("keywords", new JSArray());
        String location = call.getString("location", "Bangalore");

        List<String> keywords = new ArrayList<>();
        try {
            for (int i = 0; i < keywordsArr.length(); i++) {
                keywords.add(keywordsArr.getString(i));
            }
        } catch (JSONException e) {
            // ignore
        }

        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Email and password required");
            return;
        }

        final String finalEmail = email;
        final String finalPassword = password;
        final String query = keywords.isEmpty() ? "Dynamics 365" : String.join(" ", keywords);
        final String loc = location;

        getBridge().executeOnMainThread(() -> {
            try {
                doLinkedInScrape(finalEmail, finalPassword, query, loc, call);
            } catch (Exception e) {
                call.reject("Scrape error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void scrapeNaukri(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        JSArray keywordsArr = call.getArray("keywords", new JSArray());
        String location = call.getString("location", "Bangalore");

        List<String> keywords = new ArrayList<>();
        try {
            for (int i = 0; i < keywordsArr.length(); i++) {
                keywords.add(keywordsArr.getString(i));
            }
        } catch (JSONException e) {
            // ignore
        }

        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Email and password required");
            return;
        }

        final String finalEmail = email;
        final String finalPassword = password;
        final String query = keywords.isEmpty() ? "Dynamics 365" : String.join(" ", keywords);

        getBridge().executeOnMainThread(() -> {
            try {
                doNaukriScrape(finalEmail, finalPassword, query, call);
            } catch (Exception e) {
                call.reject("Scrape error: " + e.getMessage());
            }
        });
    }

    // ─── LinkedIn Scraper ─────────────────────────────────────────────────────

    private void doLinkedInScrape(String email, String password, String query, String location, PluginCall call) throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        final AtomicReference<JSObject> result = new AtomicReference<>(null);
        final AtomicReference<Exception> error = new AtomicReference<>(null);

        final String encodedQuery = java.net.URLEncoder.encode(query, "UTF-8");
        final String encodedLoc = java.net.URLEncoder.encode(location, "UTF-8");
        final String jobsUrl = "https://www.linkedin.com/jobs/search/?keywords=" + encodedQuery
                + "&location=" + encodedLoc + "&f_TPR=r604800&sortBy=DD&distance=25";

        createHiddenWebView(new WebViewClient() {
            private int step = 0; // 0=login, 1=post-login, 2=jobs

            @Override
            public void onPageFinished(WebView view, String url) {
                if (step == 0) {
                    step = 1;
                    // Login page loaded — fill credentials
                    handler.postDelayed(() -> fillLinkedInLogin(view, email, password, () -> {
                        // After submit, wait for redirect
                        handler.postDelayed(() -> {
                            String currentUrl = view.getUrl() != null ? view.getUrl() : "";
                            if (currentUrl.contains("/login") || currentUrl.contains("challenge") || currentUrl.contains("checkpoint")) {
                                destroyHiddenWebView();
                                JSObject err = new JSObject();
                                err.put("success", false);
                                err.put("message", "Login failed — check credentials or complete 2FA in browser");
                                err.put("blocked", true);
                                result.set(err);
                                latch.countDown();
                                return;
                            }
                            // Navigate to jobs search
                            step = 2;
                            view.loadUrl(jobsUrl);
                        }, 5000);
                    }), 2500);
                } else if (step == 2) {
                    // Jobs page loaded — scroll and extract
                    step = 3;
                    handler.postDelayed(() -> scrollAndExtractLinkedIn(view, 0, location, jobs -> {
                        destroyHiddenWebView();
                        JSObject success = new JSObject();
                        if (jobs.length() > 0) {
                            success.put("success", true);
                            success.put("jobs", jobs);
                        } else {
                            success.put("success", false);
                            success.put("message", "No jobs found");
                            success.put("blocked", true);
                        }
                        result.set(success);
                        latch.countDown();
                    }), 5000);
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        // Check for blocking page first
        hiddenWebView.loadUrl("https://www.linkedin.com/login");

        // Wait for completion (max 60 seconds)
        latch.await(60, TimeUnit.SECONDS);

        if (error.get() != null) {
            call.reject(error.get().getMessage());
        } else if (result.get() != null) {
            call.resolve(result.get());
        } else {
            call.reject("Scrape timed out");
        }
    }

    private void fillLinkedInLogin(WebView view, String email, String password, Runnable afterSubmit) {
        view.evaluateJavascript(
            "(function() {" +
            "  const selectors = ['#username', 'input[name=\"session_key\"]', 'input[type=\"email\"]', '#ap_email'];" +
            "  let emailSel = null;" +
            "  for (const s of selectors) { if (document.querySelector(s)) { emailSel = s; break; } }" +
            "  if (!emailSel) return JSON.stringify({found: false});" +
            "  const em = document.querySelector(emailSel);" +
            "  const pw = document.querySelector('#password');" +
            "  if (!em || !pw) return JSON.stringify({found: false});" +
            "  em.value = ''; em.focus();" +
            "  em.value = '" + jsEscape(email) + "';" +
            "  em.dispatchEvent(new Event('input', {bubbles:true}));" +
            "  pw.value = ''; pw.focus();" +
            "  pw.value = '" + jsEscape(password) + "';" +
            "  pw.dispatchEvent(new Event('input', {bubbles:true}));" +
            "  setTimeout(() => {" +
            "    const btn = document.querySelector('button[type=\"submit\"]');" +
            "    if (btn) btn.click();" +
            "    else document.querySelector('form')?.submit();" +
            "  }, 500);" +
            "  return JSON.stringify({found: true});" +
            "})()", null);
        handler.postDelayed(afterSubmit, 2000);
    }

    private void scrollAndExtractLinkedIn(WebView view, int scrollCount, String location, java.util.function.Consumer<JSONArray> onResult) {
        view.evaluateJavascript(
            "window.scrollBy(0, 800); 'scrolled'", null);

        if (scrollCount < 3) {
            handler.postDelayed(() -> scrollAndExtractLinkedIn(view, scrollCount + 1, location, onResult), 1500);
        } else {
            handler.postDelayed(() -> {
                view.evaluateJavascript(
                    "(function() {" +
                    "  const results = [];" +
                    "  let cards = document.querySelectorAll('.jobs-search-results__list-item');" +
                    "  if (!cards.length) cards = document.querySelectorAll('.occludable-job-card');" +
                    "  if (!cards.length) cards = document.querySelectorAll('[data-occludable-job-id]');" +
                    "  if (!cards.length) cards = document.querySelectorAll('.job-card-container');" +
                    "  cards.forEach(card => {" +
                    "    const titleEl = card.querySelector('.job-card-list__title--link, .occludable-job-card__title, a[data-job-id]');" +
                    "    const title = titleEl ? (titleEl.textContent || '').trim() : '';" +
                    "    const companyEl = card.querySelector('.job-card-container__company-name, .occludable-job-card__company-name');" +
                    "    const company = companyEl ? (companyEl.textContent || '').trim() : '';" +
                    "    const locEl = card.querySelector('.job-card-container__metadata-item');" +
                    "    const loc = locEl ? (locEl.textContent || '').trim() : '';" +
                    "    const linkEl = card.querySelector('a[href*=\"/jobs/\"]');" +
                    "    const link = linkEl ? 'https://www.linkedin.com' + (linkEl.getAttribute('href') || '').split('?')[0] : '';" +
                    "    const salaryEl = card.querySelector('.job-card-container__salary-info');" +
                    "    const salary = salaryEl ? (salaryEl.textContent || '').trim() : '';" +
                    "    if (title && !title.includes('Promoted')) {" +
                    "      results.push({title: title, company: company, location: loc || '" + java.util.regex.Matcher.quoteReplacement(location) + "', salary: salary, url: link, source: 'LinkedIn', sourceColor: '#0077b5'});" +
                    "    }" +
                    "  });" +
                    "  JSON.stringify({jobs: results.slice(0, 30), count: cards.length});" +
                    "})()",
                    value -> {
                        try {
                            String json = value != null ? value : "{\"jobs\":[],\"count\":0}";
                            // Strip quotes if evaluateJavascript wraps it
                            if (json.startsWith("\"") && json.endsWith("\"")) {
                                json = json.substring(1, json.length() - 1).replace("\\\"", "\"");
                            }
                            JSONObject data = new JSONObject(json);
                            JSONArray jobs = data.getJSONArray("jobs");
                            onResult.accept(jobs);
                        } catch (JSONException e) {
                            onResult.accept(new JSONArray());
                        }
                    });
            }, 2000);
        }
    }

    // ─── Naukri Scraper ───────────────────────────────────────────────────────

    private void doNaukriScrape(String email, String password, String query, PluginCall call) throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        final AtomicReference<JSObject> result = new AtomicReference<>(null);
        final AtomicReference<Exception> error = new AtomicReference<>(null);

        final String encodedQuery = java.net.URLEncoder.encode(query, "UTF-8");
        final String searchUrl = "https://www.naukri.com/jobs-in-bangalore?q=" + encodedQuery
                + "&k=" + encodedQuery + "&l=Bangalore&experience=4-10";

        createHiddenWebView(new WebViewClient() {
            private int step = 0;

            @Override
            public void onPageFinished(WebView view, String url) {
                if (step == 0) {
                    step = 1;
                    handler.postDelayed(() -> fillNaukriLogin(view, email, password, () -> {
                        handler.postDelayed(() -> {
                            String currentUrl = view.getUrl() != null ? view.getUrl() : "";
                            if (!currentUrl.contains("login")) {
                                // Already logged in or login succeeded - go to search
                                step = 2;
                                view.loadUrl(searchUrl);
                            } else {
                                // Login page still showing
                                handler.postDelayed(() -> {
                                    step = 2;
                                    view.loadUrl(searchUrl);
                                }, 6000);
                            }
                        }, 5000);
                    }), 3000);
                } else if (step == 2) {
                    step = 3;
                    handler.postDelayed(() -> scrollAndExtractNaukri(view, 0, jobs -> {
                        destroyHiddenWebView();
                        JSObject success = new JSObject();
                        if (jobs.length() > 0) {
                            success.put("success", true);
                            success.put("jobs", jobs);
                        } else {
                            success.put("success", false);
                            success.put("message", "No jobs found");
                            success.put("blocked", true);
                        }
                        result.set(success);
                        latch.countDown();
                    }), 5000);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        hiddenWebView.loadUrl("https://www.naukri.com/nlogin/login");
        latch.await(60, TimeUnit.SECONDS);

        if (error.get() != null) {
            call.reject(error.get().getMessage());
        } else if (result.get() != null) {
            call.resolve(result.get());
        } else {
            call.reject("Naukri scrape timed out");
        }
    }

    private void fillNaukriLogin(WebView view, String email, String password, Runnable afterSubmit) {
        view.evaluateJavascript(
            "(function() {" +
            "  const emailField = document.querySelector('input[type=\"email\"], input[id=\"emailField\"], input[name=\"email\"]');" +
            "  const passField = document.querySelector('input[type=\"password\"], input[id=\"passwordField\"], input[name=\"password\"]');" +
            "  if (!emailField || !passField) return 'no_fields';" +
            "  emailField.value = ''; emailField.focus();" +
            "  emailField.value = '" + jsEscape(email) + "';" +
            "  emailField.dispatchEvent(new Event('input', {bubbles:true}));" +
            "  passField.value = ''; passField.focus();" +
            "  passField.value = '" + jsEscape(password) + "';" +
            "  passField.dispatchEvent(new Event('input', {bubbles:true}));" +
            "  setTimeout(() => {" +
            "    const btn = document.querySelector('button[type=\"submit\"], .btn-login, input[type=\"submit\"], #loginButton');" +
            "    if (btn) btn.click();" +
            "    else document.querySelector('form')?.submit();" +
            "  }, 500);" +
            "  return 'filled';" +
            "})()", null);
        handler.postDelayed(afterSubmit, 2000);
    }

    private void scrollAndExtractNaukri(WebView view, int scrollCount, java.util.function.Consumer<JSONArray> onResult) {
        view.evaluateJavascript("window.scrollBy(0, 600); 'scrolled'", null);

        if (scrollCount < 3) {
            handler.postDelayed(() -> scrollAndExtractNaukri(view, scrollCount + 1, onResult), 1200);
        } else {
            handler.postDelayed(() -> {
                view.evaluateJavascript(
                    "(function() {" +
                    "  const results = [];" +
                    "  const tuples = document.querySelectorAll('.jobTuple, article[class*=\"job\"], .resumeaccordion');" +
                    "  tuples.forEach(card => {" +
                    "    const titleEl = card.querySelector('.title, [class*=\"title\"], a[href*=\"/job/\"]');" +
                    "    const title = titleEl ? (titleEl.textContent || '').trim() : '';" +
                    "    const companyEl = card.querySelector('.company, [class*=\"company\"], .subTitle');" +
                    "    const company = companyEl ? (companyEl.textContent || '').trim() : '';" +
                    "    const locEl = card.querySelector('.location, [class*=\"location\"]');" +
                    "    const loc = locEl ? (locEl.textContent || '').trim() : '';" +
                    "    const expEl = card.querySelector('.experience, [class*=\"experience\"]');" +
                    "    const exp = expEl ? (expEl.textContent || '').trim() : '';" +
                    "    const salaryEl = card.querySelector('.salary, [class*=\"salary\"]');" +
                    "    const salary = salaryEl ? (salaryEl.textContent || '').trim() : (exp || '₹ As per profile');" +
                    "    const linkEl = card.querySelector('a[href*=\"/job/\"]');" +
                    "    const link = linkEl ? (linkEl.getAttribute('href') || '') : '';" +
                    "    if (title) results.push({title: title, company: company, location: loc || 'Bangalore', salary: salary, url: link, source: 'Naukri', sourceColor: '#d32f2f'});" +
                    "  });" +
                    "  JSON.stringify({jobs: results.slice(0, 30), count: tuples.length});" +
                    "})()",
                    value -> {
                        try {
                            String json = value != null ? value : "{\"jobs\":[],\"count\":0}";
                            if (json.startsWith("\"") && json.endsWith("\"")) {
                                json = json.substring(1, json.length() - 1).replace("\\\"", "\"");
                            }
                            JSONObject data = new JSONObject(json);
                            JSONArray jobs = data.getJSONArray("jobs");
                            onResult.accept(jobs);
                        } catch (JSONException e) {
                            onResult.accept(new JSONArray());
                        }
                    });
            }, 2000);
        }
    }

    // ─── WebView management ────────────────────────────────────────────────────

    private void createHiddenWebView(WebViewClient client) {
        destroyHiddenWebView();
        android.content.Context ctx = getActivity();

        handler.post(() -> {
            hiddenWebView = new WebView(ctx);
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

            // Enable cookies
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(hiddenWebView, true);

            // Add view to activity
            getActivity().addContentView(hiddenWebView,
                new android.view.ViewGroup.LayoutParams(1, 1));
        });

        // Wait briefly for WebView creation
        try { Thread.sleep(100); } catch (InterruptedException ignored) {}
    }

    private void destroyHiddenWebView() {
        if (hiddenWebView != null) {
            handler.post(() -> {
                hiddenWebView.stopLoading();
                hiddenWebView.destroy();
                hiddenWebView = null;
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