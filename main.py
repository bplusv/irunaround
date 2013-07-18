import os
import re
from string import letters
import webapp2
import jinja2
import json
from google.appengine.ext import db
import irunaround.frontend as frontend


template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), autoescape = True)

def render_str(template, **params):
	t = jinja_env.get_template(template)
	return t.render(params)

class BaseHandler(webapp2.RequestHandler):
	def render(self, template, **kw):
		self.response.out.write(render_str(template, **kw))

	def write(self, *a, **kw):
		self.response.out.write(*a, **kw)

class MainPageHandler(BaseHandler):
	def get(self):
		self.render('main.html', theme='flick')

from pymag_trees.gen import Tree
class TreeJSONEncoder(json.JSONEncoder):
	def default(self, obj):
		if isinstance(obj, Tree):
			return [obj.node, obj.children]
		return json.JSONEncoder.default(self, obj)


class ParseHandler(BaseHandler):
	def post(self):
		text = self.request.get('code')
		result = frontend.drawtree(text)
		self.response.headers['Content-Type'] = 'application/json'  
		# self.response.out.write(json.dumps(result))
		self.response.out.write(TreeJSONEncoder().encode(result))

app = webapp2.WSGIApplication([('/', MainPageHandler),
								('/parse', ParseHandler)],
								debug=True)