import threading
import webbrowser

from app import create_app


app = create_app()


def open_browser():
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    threading.Timer(1.5, open_browser).start()

    app.run(
        debug=False,
        host="127.0.0.1",
        port=5000,
        use_reloader=False
    )