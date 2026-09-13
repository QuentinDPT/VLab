using Microsoft.Extensions.DependencyInjection;
using QMTGroup.Camera;
using QMTGroup.Core;
using QMTGroup.DSL.Hub;
using QMTGroup.DSL.Library.EmguCV;
using QMTGroup.DSL.Library.Math;
using QMTGroup.DSL.Library.Standard;
using QMTGroup.DSL.Library.Vision;
using QMTGroup.DSL.Lua;
using QMTGroup.Image.Interface;
using QMTGroup.Web.Factory;
using QMTGroup.Web.Plugin;
using QMTGroup.Web.Service;
using QMTGroup.WebLogger;
using System.Runtime;

namespace QMTGroup.Web
{
    public class Program
    {
        public static void Main(string[] args)
        {
            GCSettings.LatencyMode = GCLatencyMode.SustainedLowLatency;

            var configurationBuilder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .AddCommandLine(args);

            IConfiguration configuration = configurationBuilder.Build();


            var builder = WebApplication.CreateBuilder(args);
            builder.WebHost.UseUrls(["https://localhost:7083", "http://localhost:5062", "https://0.0.0.0:7083", "http://0.0.0.0:5062"]);
            builder.Configuration.AddConfiguration(configuration);

            // Add services to the container.
            builder.Services.AddRazorPages();

            builder.Services.AddSignalR();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("DevCors", policy =>
                {
                    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                });
            });

            builder.Services.AddHttpContextAccessor();

            builder.Services.AddSingleton<AssemblyTypes>(_ => new(AppDomain.CurrentDomain.GetAssemblies()));

            builder.Services.AddPluginFromConfiguration(configuration);

            builder.Services.AddScoped<StdLib>();
            builder.Services.AddScoped<LogLib>();
            builder.Services.AddSingleton<MathLib>();
            builder.Services.AddScoped<CameraLib>();

            builder.Services.AddSingleton<EmguCVLib>();

            builder.Services.AddScoped<IWebLogger>(provider =>
            {
                var httpContextAccessor = provider.GetRequiredService<IHttpContextAccessor>();
                var httpContext = httpContextAccessor.HttpContext;
                if (httpContext != null)
                {
                    return new WebLogger.WebLogger(httpContext.Response.Body);
                }
                throw new InvalidOperationException("HTTP context is not available.");
            });
            builder.Services.AddSingleton<IMemoryLogger, MemoryLoggerStub>();

            builder.Services.AddSingleton<IResourceHub, ResourceHub>();
            builder.Services.AddScoped<DSLLuaEngine>();
            builder.Services.AddScoped<DSLLuaLibraryFactory>();

            builder.Services.AddSingleton<VideoStreamService>();
            builder.Services.AddSingleton<ICameraFactory, CameraFactory>();
            builder.Services.AddSingleton<IJpegConverter, Image.EmguCV.CodecConverter>();
            builder.Services.AddSingleton<OverlayService>();
            builder.Services.AddSingleton<CodeStorageService>();
            builder.Services.AddSingleton<SequencerStorageService>();

            builder.Logging.ClearProviders(); // Désactive tous les loggers
            builder.Logging.AddConsole();
            builder.Logging.AddDebug(); // Active seulement les logs en mode debug

            var app = builder.Build();

            app.UseCors("DevCors");

            // Configure the HTTP request pipeline.
            if (!app.Environment.IsDevelopment())
            {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();
            app.UseAuthorization();
            app.MapControllers();

            app.MapRazorPages();

            var cameraFactory = app.Services.GetService<ICameraFactory>();
            if (cameraFactory is null)
                throw new NullReferenceException(nameof(cameraFactory));

            cameraFactory.Create<Camera.EmguCV.Camera>(
                new Camera.EmguCV.StartupParameters()
                {
                    Slot = 0,
                },
                new Camera.PostAcquisitionParameters()
                {
                    ForceGrayScale = true,
                    HorizontalFlip = false,
                    VerticalFlip = false,
                    Rotation = QuarterRotation.Deg0,
                });
            cameraFactory.Create<Camera.EmguCV.Camera>(
                new Camera.EmguCV.StartupParameters()
                {
                    Slot = 1,
                },
                new Camera.PostAcquisitionParameters()
                {
                    ForceGrayScale = true,
                    HorizontalFlip = false,
                    VerticalFlip = false,
                    Rotation = QuarterRotation.Deg0,
                });
            cameraFactory.Create<Camera.Halcon.Camera>(new Camera.Halcon.StartupParameters());
            cameraFactory.Create<Camera.File.Camera>(
                new Camera.File.StartupParameters()
                {
                    FileLocation = @"..\rgb_calibration.png",
                },
                new PostAcquisitionParameters());

            app.Run();
        }
    }
}
