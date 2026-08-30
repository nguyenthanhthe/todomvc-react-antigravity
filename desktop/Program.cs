namespace TodoMVC;

static class Program
{
    [STAThread]
    static void Main()
    {
        string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log");
        try
        {
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) => {
                File.WriteAllText(logPath, "ThreadException: " + e.Exception.ToString());
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                File.WriteAllText(logPath, "UnhandledException: " + e.ExceptionObject?.ToString());
            };

            ApplicationConfiguration.Initialize();
            Application.Run(new Form1());
        }
        catch (Exception ex)
        {
            File.WriteAllText(logPath, "MainCatch: " + ex.ToString());
        }
    }    
}