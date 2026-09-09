using QMTGroup.Image;

namespace QMTGroup.ImageFilters;

/// <summary>
/// Represents a filter algorithm to apply to a video stream
/// </summary>
public interface IImageFilter
{
    /// <summary>
    /// Defines the filter algorithm.
    /// </summary>
    /// <param name="input">The input image to process by the filter</param>
    /// <returns>The filtered image</returns>
    public Matrix ApplyFilter(Matrix input);
}
