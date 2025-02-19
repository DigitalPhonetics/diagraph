import { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';

import 'tinymce/tinymce';
// DOM model
import 'tinymce/models/dom/model'
// Theme
import 'tinymce/themes/silver';
// Toolbar icons
import 'tinymce/icons/default';
// Editor styles
import 'tinymce/skins/ui/oxide/skin';

// importing the plugin js.
// if you use a plugin that is not listed here the editor will fail to load
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/autosave';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/code';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/emoticons';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/help';
import 'tinymce/plugins/help/js/i18n/keynav/en';
import 'tinymce/plugins/image';
import 'tinymce/plugins/importcss';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/quickbars';
import 'tinymce/plugins/save';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/table';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/visualchars';
import 'tinymce/plugins/wordcount';

// importing plugin resources
import 'tinymce/plugins/emoticons/js/emojis';

// Content styles, including inline UI like fake cursors
import 'tinymce/skins/content/default/content';
import 'tinymce/skins/ui/oxide/content';


// tinymce.init({language: "de_DE",
//               language_url: "/langs/de.js",
//               directionality :"ltr"});

interface TinyMCEProps {
    initialValue?: string,
    onValueChange?: (newValue: string) => void,
    height?: number | string,
    menubar?: boolean
}

const TinyMCEEditor = (props: TinyMCEProps) => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    // eslint-disable-next-line
    const [value, setValue] = useState(props.initialValue?? '');

    return <Editor
      tinymceScriptSrc='/tinymce/tinymce.min.js'
      licenseKey='gpl'
      initialValue={props.initialValue}
      init={{
        auto_focus: true,
        height: props.height,
        menubar: props.menubar,
        extended_valid_elements : "svg[*],path[*]",
        plugins: [
          "advlist", "autolink", "anchor", "lists", "link" , "image", "charmap", "preview",
          "searchreplace", "visualblocks", "code", "fullscreen",
          "insertdatetime", "media", "table", "help", "wordcount"
        ],
        language: "en",
        // language_url: "/static/dialogmanagement/dialogdesigner/langs/de.js",
        toolbar: 'undo redo | formatselect | bold italic forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | image | help',
        images_upload_url: '/upload_image/',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
      }}
      onEditorChange={(newValue: string, editor: any) => { setValue(newValue); props.onValueChange!(newValue); }}
    />
    //   }}
    // />;
};

// TinyMCEEditor.defaultProps = {
//   initialValue: '',
//   height: '500px',
//   menubar: true,
//   onValueChange: (newValue: string) => {}
// };

export default TinyMCEEditor;