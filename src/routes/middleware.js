export function layoutMiddleware(options = {}) {
    const defaultOptions = {
        defaultLayout: '_layouts/public.html',
        layoutsDir: '_layouts',
        ...options,
    };

    return (_req, res, next) => {
        const originalRender = res.render;

        res.render = function (view, viewOptions = {}, callback) {
            const layout =
                viewOptions.layout === false
                    ? false
                    : viewOptions.layout || defaultOptions.defaultLayout;
            const options = { ...viewOptions };

            if (!layout) {
                return originalRender.call(this, view, options, callback);
            }

            originalRender.call(this, view, options, (err, html) => {
                if (err) return callback ? callback(err) : next(err);

                const layoutOptions = {
                    ...options,
                    body: html,
                };

                delete layoutOptions.layout;

                originalRender.call(this, layout, layoutOptions, callback);
            });
        };

        next();
    };
}

