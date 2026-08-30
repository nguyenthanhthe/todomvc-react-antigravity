using System;
using System.IO;
using System.Drawing;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace TodoMVC;

public partial class Form1 : Form
{
    private WebView2 webView;

    public Form1()
    {
        InitializeComponent();

        this.Text = "TodoMVC - React TypeScript";
        this.Width = 650;
        this.Height = 780;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.MinimumSize = new Size(550, 600);

        try
        {
            var icon = Icon.ExtractAssociatedIcon(Environment.ProcessPath ?? Application.ExecutablePath);
            if (icon != null)
            {
                this.Icon = icon;
            }
        }
        catch { }

        webView = new WebView2
        {
            Dock = DockStyle.Fill
        };
        this.Controls.Add(webView);
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        await InitWebViewAsync();
    }

    private async Task InitWebViewAsync()
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string distPath = Path.Combine(baseDir, "dist");
            if (!Directory.Exists(distPath))
            {
                distPath = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "dist"));
            }

            string userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TodoMVC_AppData");
            Directory.CreateDirectory(userDataFolder);

            CoreWebView2Environment env;
            try
            {
                env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await webView.EnsureCoreWebView2Async(env);
            }
            catch
            {
                string fallbackUserData = Path.Combine(Path.GetTempPath(), "TodoMVC_" + Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(fallbackUserData);
                env = await CoreWebView2Environment.CreateAsync(null, fallbackUserData);
                await webView.EnsureCoreWebView2Async(env);
            }

            if (Directory.Exists(distPath))
            {
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "todomvc.local",
                    distPath,
                    CoreWebView2HostResourceAccessKind.Allow
                );
                webView.CoreWebView2.Navigate("https://todomvc.local/index.html");
            }
            else
            {
                webView.CoreWebView2.NavigateToString("<h2 style='font-family: sans-serif; padding: 20px;'>TodoMVC dist folder not found.</h2>");
            }
        }
        catch (Exception ex)
        {
            File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "webview_error.log"), ex.ToString());
            MessageBox.Show($"Error initializing WebView2:\n{ex.Message}", "TodoMVC Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
